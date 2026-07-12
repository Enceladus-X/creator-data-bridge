import {
  type BrowserPlatform,
  type CollectionLogLevel,
  type CollectionRun,
  collectionRunSchema,
  type PlatformCollectionState,
} from "@creator-data-bridge/contracts";
import {
  collectInstagramProfilePage,
  collectInstagramReelPage,
  collectTikTokProfilePage,
  collectTikTokStudioPage,
  collectXProfilePage,
  collectYouTubeStudioContentPage,
  collectYouTubeStudioDashboardPage,
  detectInstagramHandle,
  detectXHandle,
  scrollCollectionPage,
  scrollYouTubeStudioContentPage,
} from "./collectors";
import { buildCollectionCsv, buildCollectionFileName } from "./csv";
import {
  clearCollectionDatabase,
  getCollectionRecords,
  getLatestCollectionRun,
  saveCollectionRecords,
  saveCollectionRun,
} from "./db";
import { normalizePlatformPayload } from "./records";
import {
  activateCollectionTab,
  closeCollectionTab,
  collectionDelay,
  createCollectionTab,
  executeCollector,
  type ManagedCollectionTab,
  navigateCollectionTab,
} from "./tab-manager";
import {
  type CollectionStateResponse,
  type CsvExportResponse,
  platformPermissionOrigins,
  type RawContentItem,
  type RawPlatformPayload,
} from "./types";

const currentRunStorageKey = "collection.currentRun";
const handlesStorageKey = "collection.handles";
const defaultPlatforms: BrowserPlatform[] = ["youtube", "tiktok", "x", "instagram"];
const internalItemLimit = 500;
const platformLabels: Record<BrowserPlatform, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  x: "X",
  instagram: "Instagram",
};
const selectorVersions: Record<BrowserPlatform, string> = {
  youtube: "youtube-studio-v2",
  tiktok: "tiktok-studio-v1",
  instagram: "instagram-meta-v1",
  x: "x-profile-v1",
};

let activeCollection: Promise<void> | null = null;
const cancelledRuns = new Set<string>();

function pushLog(
  run: CollectionRun,
  level: CollectionLogLevel,
  message: string,
  platform: BrowserPlatform | null = null,
  detail: string | null = null,
) {
  run.logs.push({
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    level,
    platform,
    message,
    detail,
  });
  if (run.logs.length > 500) run.logs.splice(0, run.logs.length - 500);
}

class CollectionFailure extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CollectionFailure";
  }
}

function createCheckpoint(platform: BrowserPlatform) {
  return {
    platform,
    state: "pending" as const,
    accountHandle: null,
    discovered: 0,
    rowsWritten: 0,
    warningCodes: [] as string[],
    errorCode: null,
    errorMessage: null,
    lastHeartbeatAt: null,
  };
}

function createRun(platforms: BrowserPlatform[], itemLimit: number): CollectionRun {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  return collectionRunSchema.parse({
    id,
    state: "preflight",
    requestedPlatforms: platforms,
    itemLimit,
    createdAt,
    completedAt: null,
    platforms: {
      youtube: createCheckpoint("youtube"),
      tiktok: createCheckpoint("tiktok"),
      instagram: createCheckpoint("instagram"),
      x: createCheckpoint("x"),
    },
    logs: [
      {
        id: crypto.randomUUID(),
        at: createdAt,
        level: "info",
        platform: null,
        message: "수집 실행을 생성했습니다.",
        detail: platforms.map((platform) => platformLabels[platform]).join(", "),
      },
    ],
  });
}

async function persistRun(run: CollectionRun) {
  const parsed = collectionRunSchema.parse(run);
  await Promise.all([
    chrome.storage.session.set({ [currentRunStorageKey]: parsed }),
    saveCollectionRun(parsed),
  ]);
}

async function readCurrentRun(): Promise<CollectionRun | null> {
  const result = await chrome.storage.session.get(currentRunStorageKey);
  const value = result[currentRunStorageKey];
  const parsed = collectionRunSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

async function updatePlatform(
  run: CollectionRun,
  platform: BrowserPlatform,
  changes: Partial<CollectionRun["platforms"][BrowserPlatform]>,
) {
  const previous = run.platforms[platform];
  const next = {
    ...previous,
    ...changes,
    platform,
    lastHeartbeatAt: new Date().toISOString(),
  };
  run.platforms[platform] = next;

  if (changes.state && changes.state !== previous.state) {
    const stateMessages: Partial<Record<PlatformCollectionState, string>> = {
      opening: "수집 페이지를 열고 있습니다.",
      waiting: "페이지가 준비되기를 기다리고 있습니다.",
      collecting: "페이지에서 콘텐츠를 읽기 시작했습니다.",
      normalizing: "수집 데이터를 CSV 형식으로 정리하고 있습니다.",
      completed: "플랫폼 수집을 완료했습니다.",
      failed: "플랫폼 수집에 실패했습니다.",
      cancelled: "플랫폼 수집을 중단했습니다.",
    };
    const level: CollectionLogLevel =
      changes.state === "completed"
        ? "success"
        : changes.state === "failed"
          ? "error"
          : changes.state === "cancelled"
            ? "warning"
            : "info";
    const detail = [
      next.accountHandle ? `계정 ${next.accountHandle}` : "",
      next.rowsWritten ? `저장 ${next.rowsWritten}행` : "",
      next.warningCodes.length ? `경고 ${next.warningCodes.join(", ")}` : "",
      next.errorCode ? `${next.errorCode}: ${next.errorMessage ?? "원인 미상"}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    pushLog(
      run,
      level,
      stateMessages[changes.state] ?? `상태가 ${changes.state}(으)로 변경됐습니다.`,
      platform,
      detail || null,
    );
  }
  if (changes.accountHandle && changes.accountHandle !== previous.accountHandle) {
    pushLog(run, "info", "수집 계정을 확인했습니다.", platform, changes.accountHandle);
  }
  if (changes.discovered !== undefined && changes.discovered > previous.discovered) {
    pushLog(
      run,
      "info",
      `콘텐츠 ${changes.discovered.toLocaleString("ko-KR")}개를 확인했습니다.`,
      platform,
      `이전 확인 ${previous.discovered.toLocaleString("ko-KR")}개`,
    );
  }
  await persistRun(run);
}

async function permissionStates(): Promise<Record<BrowserPlatform, boolean>> {
  const entries = await Promise.all(
    defaultPlatforms.map(
      async (platform) =>
        [
          platform,
          await chrome.permissions.contains({ origins: [platformPermissionOrigins[platform]] }),
        ] as const,
    ),
  );
  return Object.fromEntries(entries) as Record<BrowserPlatform, boolean>;
}

async function getStoredHandles() {
  const result = await chrome.storage.local.get(handlesStorageKey);
  return (result[handlesStorageKey] ?? {}) as Partial<Record<BrowserPlatform, string>>;
}

async function saveHandle(platform: BrowserPlatform, handle: string) {
  const handles = await getStoredHandles();
  await chrome.storage.local.set({ [handlesStorageKey]: { ...handles, [platform]: handle } });
}

function pathHandle(urlValue: string, platform: BrowserPlatform) {
  try {
    const url = new URL(urlValue);
    const segment = url.pathname.split("/").filter(Boolean)[0];
    if (!segment) return null;
    const reserved =
      platform === "instagram"
        ? new Set(["accounts", "direct", "explore", "reels", "p", "reel"])
        : new Set([
            "home",
            "explore",
            "notifications",
            "messages",
            "i",
            "compose",
            "settings",
            "search",
          ]);
    return reserved.has(segment.toLowerCase()) ? null : segment.replace(/^@/, "");
  } catch {
    return null;
  }
}

async function discoverHandleFromOpenTabs(platform: "instagram" | "x") {
  const pattern = platform === "instagram" ? "https://www.instagram.com/*" : "https://x.com/*";
  const tabs = await chrome.tabs.query({ url: pattern });
  for (const tab of tabs) {
    const handle = tab.url ? pathHandle(tab.url, platform) : null;
    if (handle) return handle;
  }
  return null;
}

function checkCancelled(run: CollectionRun) {
  if (cancelledRuns.has(run.id)) throw new CollectionFailure("CANCELLED", "수집이 중단되었습니다.");
}

async function retryCollector<T>(
  tab: ManagedCollectionTab,
  collect: () => Promise<T>,
  ready: (value: T) => boolean,
) {
  const waits = [0, 900, 1_800];
  for (let index = 0; index < waits.length; index += 1) {
    if ((waits[index] ?? 0) > 0) await collectionDelay(waits[index] ?? 0);
    const result = await collect();
    if (ready(result)) return result;
    if (index === 1) await activateCollectionTab(tab);
  }
  return collect();
}

function mergeItems(target: Map<string, RawContentItem>, items: RawContentItem[], limit: number) {
  for (const item of items) {
    if (!target.has(item.contentId) && target.size < limit) target.set(item.contentId, item);
  }
}

async function collectYouTube(run: CollectionRun): Promise<RawPlatformPayload> {
  const tab = await createCollectionTab("https://studio.youtube.com/");
  try {
    await updatePlatform(run, "youtube", { state: "collecting" });
    const dashboard = await retryCollector(
      tab,
      () => executeCollector(tab.tabId, collectYouTubeStudioDashboardPage, []),
      (value) => value.ok && value.profile !== null,
    );
    if (!dashboard.ok || !dashboard.profile) {
      throw new CollectionFailure(
        dashboard.errorCode ?? "LOGIN_REQUIRED",
        dashboard.errorMessage ?? "YouTube Studio 채널 정보를 읽지 못했습니다.",
      );
    }

    const channelId = dashboard.profile.accountHandle;
    await saveHandle("youtube", channelId);
    await updatePlatform(run, "youtube", { accountHandle: channelId });
    const items = new Map<string, RawContentItem>();
    const surfaces = [
      { path: "short", contentType: "short" as const },
      { path: "upload", contentType: "video" as const },
    ];

    for (const surface of surfaces) {
      if (items.size >= run.itemLimit) break;
      await navigateCollectionTab(
        tab.tabId,
        `https://studio.youtube.com/channel/${channelId}/videos/${surface.path}`,
      );
      let stablePasses = 0;
      for (let pass = 0; pass < 40 && items.size < run.itemLimit && stablePasses < 3; pass += 1) {
        checkCancelled(run);
        const payload = await retryCollector(
          tab,
          () =>
            executeCollector(tab.tabId, collectYouTubeStudioContentPage, [
              channelId,
              surface.contentType,
            ]),
          (value) => value.ok,
        );
        if (!payload.ok) {
          throw new CollectionFailure(
            payload.errorCode ?? "SURFACE_NOT_READY",
            payload.errorMessage ?? "YouTube Studio 콘텐츠를 읽지 못했습니다.",
          );
        }
        const before = items.size;
        mergeItems(items, payload.items, run.itemLimit);
        stablePasses = items.size === before ? stablePasses + 1 : 0;
        await updatePlatform(run, "youtube", { discovered: items.size });
        if (stablePasses >= 3 || items.size >= run.itemLimit) break;
        await executeCollector(tab.tabId, scrollYouTubeStudioContentPage, []);
        await collectionDelay(650);
      }
    }

    dashboard.profile.totalPostsText = String(items.size);
    return {
      ok: true,
      platform: "youtube",
      profile: dashboard.profile,
      items: [...items.values()],
      warningCodes: items.size >= run.itemLimit ? ["COLLECTION_LIMIT_REACHED"] : [],
      errorCode: null,
      errorMessage: null,
    };
  } finally {
    await closeCollectionTab(tab);
  }
}

async function collectTikTok(run: CollectionRun): Promise<RawPlatformPayload> {
  const tab = await createCollectionTab("https://www.tiktok.com/tiktokstudio/content");
  try {
    await updatePlatform(run, "tiktok", { state: "collecting" });
    const items = new Map<string, RawContentItem>();
    let profile: RawPlatformPayload["profile"] = null;
    let stablePasses = 0;
    let lastError: RawPlatformPayload | null = null;

    for (let pass = 0; pass < 40 && items.size < run.itemLimit && stablePasses < 3; pass += 1) {
      checkCancelled(run);
      const payload = await retryCollector(
        tab,
        () => executeCollector(tab.tabId, collectTikTokStudioPage, []),
        (value) => value.ok && value.items.length > 0,
      );
      lastError = payload;
      if (!payload.ok || !payload.profile) break;
      profile ??= payload.profile;
      const before = items.size;
      mergeItems(items, payload.items, run.itemLimit);
      stablePasses = items.size === before ? stablePasses + 1 : 0;
      await updatePlatform(run, "tiktok", { discovered: items.size });
      if (stablePasses >= 3 || items.size >= run.itemLimit) break;
      await executeCollector(tab.tabId, scrollCollectionPage, []);
      await collectionDelay(650);
    }

    if (!profile || items.size === 0) {
      throw new CollectionFailure(
        lastError?.errorCode ?? "LOGIN_REQUIRED",
        lastError?.errorMessage ?? "TikTok Studio를 읽지 못했습니다.",
      );
    }
    const handle = profile.accountHandle.replace(/^@/, "");
    await saveHandle("tiktok", handle);
    await updatePlatform(run, "tiktok", {
      accountHandle: `@${handle}`,
      discovered: items.size,
    });
    checkCancelled(run);
    await navigateCollectionTab(tab.tabId, `https://www.tiktok.com/@${handle}`);
    const profileDetail = await retryCollector(
      tab,
      () => executeCollector(tab.tabId, collectTikTokProfilePage, [handle]),
      (value) => value !== null,
    );
    profile = profileDetail ?? profile;
    profile.totalPostsText ??= String(items.size);
    return {
      ok: true,
      platform: "tiktok",
      profile,
      items: [...items.values()],
      warningCodes: items.size >= run.itemLimit ? ["COLLECTION_LIMIT_REACHED"] : [],
      errorCode: null,
      errorMessage: null,
    };
  } finally {
    await closeCollectionTab(tab);
  }
}

async function collectX(run: CollectionRun): Promise<RawPlatformPayload> {
  const handles = await getStoredHandles();
  const known = (await discoverHandleFromOpenTabs("x")) ?? handles.x ?? null;
  const tab = await createCollectionTab(known ? `https://x.com/${known}` : "https://x.com/home");
  try {
    let handle = known;
    if (!handle) {
      handle = await retryCollector(
        tab,
        () => executeCollector(tab.tabId, detectXHandle, []),
        (value) => value !== null,
      );
    }
    if (!handle) throw new CollectionFailure("LOGIN_REQUIRED", "X 로그인 계정을 찾지 못했습니다.");
    await saveHandle("x", handle);
    if (
      !new URL((await chrome.tabs.get(tab.tabId)).url ?? "https://x.com").pathname.startsWith(
        `/${handle}`,
      )
    ) {
      await navigateCollectionTab(tab.tabId, `https://x.com/${handle}`);
    }
    await updatePlatform(run, "x", { state: "collecting", accountHandle: `@${handle}` });

    const items = new Map<string, RawContentItem>();
    let profile: RawPlatformPayload["profile"] = null;
    let stablePasses = 0;
    for (let pass = 0; pass < 30 && items.size < run.itemLimit && stablePasses < 3; pass += 1) {
      checkCancelled(run);
      const payload = await retryCollector(
        tab,
        () => executeCollector(tab.tabId, collectXProfilePage, [handle]),
        (value) => value.ok,
      );
      if (!payload.ok)
        throw new CollectionFailure(
          payload.errorCode ?? "SURFACE_NOT_READY",
          payload.errorMessage ?? "X 프로필을 읽지 못했습니다.",
        );
      profile ??= payload.profile;
      const before = items.size;
      mergeItems(items, payload.items, run.itemLimit);
      stablePasses = items.size === before ? stablePasses + 1 : 0;
      await updatePlatform(run, "x", { discovered: items.size });
      if (stablePasses >= 3 || items.size >= run.itemLimit) break;
      await executeCollector(tab.tabId, scrollCollectionPage, []);
      await collectionDelay(650);
    }

    if (!profile)
      throw new CollectionFailure("SURFACE_NOT_READY", "X 프로필 요약을 읽지 못했습니다.");
    return {
      ok: true,
      platform: "x",
      profile,
      items: [...items.values()],
      warningCodes: items.size >= run.itemLimit ? ["COLLECTION_LIMIT_REACHED"] : [],
      errorCode: null,
      errorMessage: null,
    };
  } finally {
    await closeCollectionTab(tab);
  }
}

async function collectInstagram(run: CollectionRun): Promise<RawPlatformPayload> {
  const handles = await getStoredHandles();
  const known = (await discoverHandleFromOpenTabs("instagram")) ?? handles.instagram ?? null;
  const tab = await createCollectionTab(
    known ? `https://www.instagram.com/${known}/` : "https://www.instagram.com/",
  );
  try {
    let handle = known;
    if (!handle) {
      handle = await retryCollector(
        tab,
        () => executeCollector(tab.tabId, detectInstagramHandle, []),
        (value) => value !== null,
      );
    }
    if (!handle)
      throw new CollectionFailure("LOGIN_REQUIRED", "Instagram 로그인 계정을 찾지 못했습니다.");
    await saveHandle("instagram", handle);
    const currentUrl = (await chrome.tabs.get(tab.tabId)).url ?? "";
    if (!currentUrl.includes(`instagram.com/${handle}/`)) {
      await navigateCollectionTab(tab.tabId, `https://www.instagram.com/${handle}/`);
    }
    await updatePlatform(run, "instagram", {
      state: "collecting",
      accountHandle: `@${handle}`,
    });

    const discovered = new Map<string, RawContentItem>();
    let profile: RawPlatformPayload["profile"] = null;
    let stablePasses = 0;
    for (
      let pass = 0;
      pass < 20 && discovered.size < run.itemLimit && stablePasses < 2;
      pass += 1
    ) {
      checkCancelled(run);
      const payload = await retryCollector(
        tab,
        () => executeCollector(tab.tabId, collectInstagramProfilePage, [handle]),
        (value) => value.ok,
      );
      if (!payload.ok)
        throw new CollectionFailure(
          payload.errorCode ?? "SURFACE_NOT_READY",
          payload.errorMessage ?? "Instagram 프로필을 읽지 못했습니다.",
        );
      profile ??= payload.profile;
      const before = discovered.size;
      mergeItems(discovered, payload.items, run.itemLimit);
      stablePasses = discovered.size === before ? stablePasses + 1 : 0;
      await updatePlatform(run, "instagram", { discovered: discovered.size });
      if (stablePasses >= 2 || discovered.size >= run.itemLimit) break;
      await executeCollector(tab.tabId, scrollCollectionPage, []);
      await collectionDelay(650);
    }

    if (!profile)
      throw new CollectionFailure("SURFACE_NOT_READY", "Instagram 프로필 요약을 읽지 못했습니다.");
    const details: RawContentItem[] = [];
    const warnings: string[] = [];
    for (const item of discovered.values()) {
      checkCancelled(run);
      await navigateCollectionTab(tab.tabId, item.contentUrl);
      const detail = await retryCollector(
        tab,
        () => executeCollector(tab.tabId, collectInstagramReelPage, [handle, item.contentId]),
        (value) => value !== null,
      );
      if (detail) {
        details.push(detail);
      } else {
        details.push({ ...item, notes: [...item.notes, "detail_not_ready"] });
        warnings.push("SURFACE_NOT_READY");
      }
      await updatePlatform(run, "instagram", { discovered: details.length });
    }

    return {
      ok: true,
      platform: "instagram",
      profile,
      items: details,
      warningCodes: [...new Set(warnings)],
      errorCode: null,
      errorMessage: null,
    };
  } finally {
    await closeCollectionTab(tab);
  }
}

async function collectPlatform(run: CollectionRun, platform: BrowserPlatform) {
  if (platform === "youtube") return collectYouTube(run);
  if (platform === "tiktok") return collectTikTok(run);
  if (platform === "x") return collectX(run);
  return collectInstagram(run);
}

async function collectAndStorePlatform(run: CollectionRun, platform: BrowserPlatform) {
  await updatePlatform(run, platform, { state: "opening" });
  try {
    const payload = await collectPlatform(run, platform);
    await updatePlatform(run, platform, { state: "normalizing" });
    const records = normalizePlatformPayload(
      run.id,
      payload,
      selectorVersions[platform],
      new Date().toISOString(),
    );
    await saveCollectionRecords(records);
    await updatePlatform(run, platform, {
      state: "completed",
      rowsWritten: records.length,
      discovered: payload.items.length,
      accountHandle: records[0]?.accountHandle ?? null,
      warningCodes: payload.warningCodes,
      errorCode: null,
      errorMessage: null,
    });
  } catch (error) {
    const failure =
      error instanceof CollectionFailure
        ? error
        : new CollectionFailure(
            "COLLECTION_FAILED",
            error instanceof Error ? error.message : "수집에 실패했습니다.",
          );
    await updatePlatform(run, platform, {
      state: failure.code === "CANCELLED" ? "cancelled" : "failed",
      errorCode: failure.code,
      errorMessage: failure.message,
    });
  }
}

async function finalizeRun(run: CollectionRun) {
  const checkpoints = run.requestedPlatforms.map((platform) => run.platforms[platform]);
  const completed = checkpoints.filter((checkpoint) => checkpoint.state === "completed");
  const hasWarnings = checkpoints.some((checkpoint) => checkpoint.warningCodes.length > 0);
  run.completedAt = new Date().toISOString();
  run.state = cancelledRuns.has(run.id)
    ? "cancelled"
    : completed.length === checkpoints.length && !hasWarnings
      ? "completed"
      : completed.length > 0
        ? "partially_completed"
        : "failed";
  const totalRows = checkpoints.reduce((total, checkpoint) => total + checkpoint.rowsWritten, 0);
  const level: CollectionLogLevel =
    run.state === "completed" ? "success" : run.state === "failed" ? "error" : "warning";
  pushLog(
    run,
    level,
    run.state === "completed"
      ? "전체 수집을 완료했습니다."
      : run.state === "cancelled"
        ? "전체 수집이 중단됐습니다."
        : run.state === "failed"
          ? "수집된 플랫폼이 없습니다."
          : "일부 플랫폼 수집을 완료했습니다.",
    null,
    `완료 ${completed.length}/${checkpoints.length}개 플랫폼 · 저장 ${totalRows.toLocaleString("ko-KR")}행`,
  );
  await persistRun(run);
  cancelledRuns.delete(run.id);
}

async function executeRun(run: CollectionRun) {
  run.state = "running";
  pushLog(run, "info", "사이트 권한을 확인하고 수집을 시작합니다.");
  await persistRun(run);
  const permissions = await permissionStates();
  const permittedCount = run.requestedPlatforms.filter((platform) => permissions[platform]).length;
  pushLog(
    run,
    permittedCount === run.requestedPlatforms.length ? "success" : "warning",
    "사이트 권한 확인을 마쳤습니다.",
    null,
    `허용 ${permittedCount}/${run.requestedPlatforms.length}개 플랫폼`,
  );
  await persistRun(run);

  for (const platform of run.requestedPlatforms) {
    if (cancelledRuns.has(run.id)) break;
    if (!permissions[platform]) {
      await updatePlatform(run, platform, {
        state: "failed",
        errorCode: "PERMISSION_REQUIRED",
        errorMessage: `${platform} 사이트 권한이 필요합니다.`,
      });
      continue;
    }
    await collectAndStorePlatform(run, platform);
  }
  await finalizeRun(run);
}

export async function startCollection(platforms = defaultPlatforms): Promise<CollectionRun> {
  const current = await readCurrentRun();
  if (current && ["preflight", "running"].includes(current.state) && activeCollection)
    return current;
  const uniquePlatforms = [...new Set(platforms)].filter((platform): platform is BrowserPlatform =>
    defaultPlatforms.includes(platform),
  );
  const run = createRun(
    uniquePlatforms.length ? uniquePlatforms : defaultPlatforms,
    internalItemLimit,
  );
  await persistRun(run);
  activeCollection = executeRun(run).finally(() => {
    activeCollection = null;
  });
  return run;
}

export async function cancelCollection(runId: string) {
  cancelledRuns.add(runId);
  const run = await readCurrentRun();
  if (run?.id === runId) {
    run.state = "cancelled";
    run.completedAt = new Date().toISOString();
    pushLog(run, "warning", "사용자가 수집 중단을 요청했습니다.");
    await persistRun(run);
  }
  return run;
}

export async function retryCollectionPlatform(runId: string, platform: BrowserPlatform) {
  const run = await readCurrentRun();
  if (!run || run.id !== runId) {
    throw new CollectionFailure("RUN_NOT_FOUND", "재시도할 수집 기록을 찾지 못했습니다.");
  }
  if (activeCollection) return run;
  if (!run.requestedPlatforms.includes(platform)) {
    throw new CollectionFailure(
      "PLATFORM_NOT_IN_RUN",
      "이 수집 기록에 포함되지 않은 플랫폼입니다.",
    );
  }
  const permitted = await chrome.permissions.contains({
    origins: [platformPermissionOrigins[platform]],
  });
  if (!permitted) {
    throw new CollectionFailure("PERMISSION_REQUIRED", `${platform} 사이트 권한이 필요합니다.`);
  }

  run.state = "running";
  run.completedAt = null;
  run.platforms[platform] = createCheckpoint(platform);
  pushLog(run, "info", "플랫폼 수집을 다시 시도합니다.", platform);
  await persistRun(run);
  activeCollection = (async () => {
    await collectAndStorePlatform(run, platform);
    await finalizeRun(run);
  })().finally(() => {
    activeCollection = null;
  });
  return run;
}

export async function getCollectionState(): Promise<CollectionStateResponse> {
  const run = (await readCurrentRun()) ?? (await getLatestCollectionRun());
  return {
    run,
    records: run ? await getCollectionRecords(run.id) : [],
    permissions: await permissionStates(),
  };
}

export async function exportCollectionCsv(runId?: string): Promise<CsvExportResponse> {
  const run = (await readCurrentRun()) ?? (await getLatestCollectionRun());
  const targetRunId = runId ?? run?.id;
  if (!targetRunId)
    throw new CollectionFailure("NO_COLLECTION_DATA", "내보낼 수집 데이터가 없습니다.");
  const records = await getCollectionRecords(targetRunId);
  if (records.length === 0)
    throw new CollectionFailure("NO_COLLECTION_DATA", "내보낼 수집 데이터가 없습니다.");
  return {
    fileName: buildCollectionFileName(records),
    csv: buildCollectionCsv(records),
  };
}

export async function clearCollectionData() {
  cancelledRuns.clear();
  await Promise.all([
    clearCollectionDatabase(),
    chrome.storage.session.remove(currentRunStorageKey),
    chrome.storage.local.remove(handlesStorageKey),
  ]);
}

export async function recoverInterruptedCollection() {
  const run = await readCurrentRun();
  if (!run || !["preflight", "running"].includes(run.state)) return;
  for (const platform of run.requestedPlatforms) {
    const checkpoint = run.platforms[platform];
    if (!["completed", "failed", "cancelled"].includes(checkpoint.state)) {
      run.platforms[platform] = {
        ...checkpoint,
        state: "failed",
        errorCode: "WORKER_INTERRUPTED",
        errorMessage: "브라우저가 중단되어 이 플랫폼을 다시 수집해야 합니다.",
        lastHeartbeatAt: new Date().toISOString(),
      };
    }
  }
  const hasCompleted = run.requestedPlatforms.some(
    (platform) => run.platforms[platform].state === "completed",
  );
  run.state = hasCompleted ? "partially_completed" : "failed";
  run.completedAt = new Date().toISOString();
  pushLog(
    run,
    "warning",
    "브라우저 중단으로 실행을 복구했습니다.",
    null,
    "완료되지 않은 플랫폼은 다시 수집해야 합니다.",
  );
  await persistRun(run);
}
