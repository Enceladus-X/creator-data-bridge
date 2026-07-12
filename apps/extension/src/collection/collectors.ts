import type { RawContentItem, RawPlatformPayload, RawProfile } from "./types";

export function collectYouTubeStudioDashboardPage(): RawPlatformPayload {
  const channelLink = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a[href^="/channel/"]'),
  )
    .map((anchor) => anchor.getAttribute("href") ?? "")
    .find((href) => /^\/channel\/UC[A-Za-z0-9_-]+$/.test(href));
  const channelId = channelLink?.match(/^\/channel\/(UC[A-Za-z0-9_-]+)$/)?.[1] ?? "";
  const accountName = (
    document.querySelector<HTMLElement>("#entity-name")?.textContent ?? ""
  ).trim();
  const analyticsCard = document.querySelector<HTMLElement>("ytcd-channel-facts-item");
  const subscribersText = (
    analyticsCard?.querySelector<HTMLElement>(".metric-value-big")?.textContent ?? ""
  ).trim();
  const channelViewsText = (
    analyticsCard?.querySelector<HTMLElement>("#metric-0-value")?.textContent ?? ""
  ).trim();
  const watchHoursText = (
    analyticsCard?.querySelector<HTMLElement>("#metric-1-value")?.textContent ?? ""
  ).trim();
  const ready = Boolean(channelId && accountName);

  return {
    ok: ready,
    platform: "youtube",
    profile: ready
      ? {
          accountName,
          accountHandle: channelId,
          followersText: subscribersText || null,
          followingText: null,
          totalPostsText: null,
          totalLikesText: null,
          channelViewsText: channelViewsText || null,
          watchHoursText: watchHoursText || null,
          notes: ["analytics_period=last_28_days"],
        }
      : null,
    items: [],
    warningCodes: [],
    errorCode: ready ? null : "LOGIN_OR_CHANNEL_REQUIRED",
    errorMessage: ready ? null : "YouTube Studio 채널 정보를 찾지 못했습니다.",
  };
}

export function collectYouTubeStudioContentPage(
  expectedChannelId: string,
  contentType: "video" | "short",
): RawPlatformPayload {
  const currentChannelId = location.pathname.match(/^\/channel\/(UC[A-Za-z0-9_-]+)/)?.[1] ?? "";
  const tableReady = Boolean(
    document.querySelector(
      'table[aria-label], ytcp-video-section, ytcp-video-list, [role="table"]',
    ),
  );
  const rowNodes = Array.from(
    document.querySelectorAll<HTMLElement>('ytcp-video-row, [role="row"]'),
  );
  const items: RawContentItem[] = [];
  const seen = new Set<string>();

  const compactCountPattern = /\d+(?:[.,]\d+)*(?:\s*[kKmMbB\uCC9C\uB9CC\uC5B5])?/g;
  const elementText = (row: HTMLElement, selectors: string[]) => {
    for (const selector of selectors) {
      const element = row.querySelector<HTMLElement>(selector);
      const value = (element?.textContent ?? "").trim().replace(/\s+/g, " ");
      if (value) return value;
    }
    return null;
  };
  const metricText = (row: HTMLElement, selectors: string[], preferLast = false) => {
    for (const selector of selectors) {
      const element = row.querySelector<HTMLElement>(selector);
      if (!element) continue;
      const candidates = [
        element.getAttribute("aria-label"),
        element.getAttribute("title"),
        element.textContent,
      ];
      for (const candidate of candidates) {
        if (!candidate) continue;
        const matches = Array.from(candidate.matchAll(compactCountPattern))
          .filter(
            (match) => candidate.slice((match.index ?? 0) + match[0].length).trimStart()[0] !== "%",
          )
          .map((match) => match[0].replace(/\s+/g, ""));
        if (matches.length > 0) {
          return preferLast ? (matches.at(-1) ?? null) : (matches[0] ?? null);
        }
      }
    }
    return null;
  };

  for (const row of rowNodes) {
    const editLink = Array.from(row.querySelectorAll<HTMLAnchorElement>('a[href*="/video/"]')).find(
      (anchor) => /\/video\/[^/?#]+(?:\/edit)?/.test(anchor.getAttribute("href") ?? ""),
    );
    const id = editLink?.getAttribute("href")?.match(/\/video\/([^/?#]+)/)?.[1];
    if (!id || seen.has(id)) continue;
    const titleElement =
      row.querySelector<HTMLElement>("#video-title") ??
      editLink ??
      row.querySelector<HTMLElement>('[aria-label*="동영상"]');
    const visibility = elementText(row, [
      ".tablecell-visibility #visibility",
      ".tablecell-visibility #visibility-text",
      ".tablecell-visibility",
      "#visibility",
      "#visibility-text",
    ]);

    items.push({
      contentId: id,
      contentUrl:
        contentType === "short"
          ? `https://www.youtube.com/shorts/${id}`
          : `https://www.youtube.com/watch?v=${id}`,
      contentType,
      title: (titleElement?.getAttribute("title") ?? titleElement?.textContent ?? "").trim(),
      publishedDisplay: elementText(row, [
        ".tablecell-date #date-text",
        ".tablecell-date .date",
        ".tablecell-date",
        "#date-text",
        ".date",
      ]),
      publishedAt: null,
      durationDisplay: elementText(row, [
        "#video-thumbnail #duration",
        "#duration",
        ".video-duration",
      ]),
      durationSeconds: null,
      viewsText: metricText(row, [
        ".tablecell-views #metric-value",
        ".tablecell-views .metric-value",
        ".tablecell-views",
        "#views",
      ]),
      likesText: metricText(
        row,
        [".tablecell-likes .likes-container", ".likes-container", ".tablecell-likes", "#likes"],
        true,
      ),
      commentsText: metricText(row, [
        ".tablecell-comments .comments-link",
        ".comments-link",
        ".tablecell-comments #metric-value",
        ".tablecell-comments",
        "#comments",
      ]),
      sharesText: null,
      savesText: null,
      notes: visibility ? [`visibility=${visibility}`] : [],
    });
    seen.add(id);
  }

  const accountMatches = currentChannelId === expectedChannelId;
  return {
    ok: accountMatches && tableReady,
    platform: "youtube",
    profile: null,
    items,
    warningCodes: [],
    errorCode: accountMatches ? (tableReady ? null : "SURFACE_NOT_READY") : "ACCOUNT_MISMATCH",
    errorMessage: accountMatches
      ? tableReady
        ? null
        : "YouTube Studio 콘텐츠 표가 준비되지 않았습니다."
      : "YouTube Studio 채널이 일치하지 않습니다.",
  };
}

export function scrollYouTubeStudioContentPage(): { before: number; after: number } {
  const firstRow = document.querySelector<HTMLElement>("ytcp-video-row, [role='row']");
  let candidate = firstRow?.parentElement ?? null;
  while (candidate) {
    if (candidate.scrollHeight > candidate.clientHeight + 40) {
      const before = candidate.scrollTop;
      candidate.scrollBy({
        top: Math.max(candidate.clientHeight * 0.85, 600),
        behavior: "instant",
      });
      return { before, after: candidate.scrollTop };
    }
    candidate = candidate.parentElement;
  }
  const scrollingElement = document.scrollingElement;
  const before = scrollingElement?.scrollTop ?? window.scrollY;
  window.scrollBy({ top: Math.max(window.innerHeight * 0.85, 700), behavior: "instant" });
  return { before, after: document.scrollingElement?.scrollTop ?? window.scrollY };
}

export function collectTikTokStudioPage(): RawPlatformPayload {
  const items: RawContentItem[] = [];
  const seen = new Set<string>();
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/video/"]'));

  for (const anchor of anchors) {
    const id = anchor.href.match(/\/video\/(\d+)/)?.[1];
    const handle = anchor.href.match(/\/@([^/]+)\/video\//)?.[1];
    if (!id || !handle || seen.has(id)) continue;

    let row: HTMLElement | null = anchor;
    while (row && !row.querySelector('button[data-tt*="PrivacyCell"]')) {
      row = row.parentElement;
    }
    if (!row) continue;

    const contentCell = row.children.item(0) as HTMLElement | null;
    const metricArea = row.children.item(1) as HTMLElement | null;
    const contentText = (contentCell?.textContent ?? "").trim().replace(/\s+/g, " ");
    const duration = contentText.match(/^(\d{1,2}:\d{2}(?::\d{2})?)/)?.[1] ?? null;
    const published =
      contentText.match(
        /(?:(?:\d{4}년\s*)?\d{1,2}월\s*\d{1,2}일(?:\s*(?:오전|오후)\s*\d{1,2}:\d{2})?)/,
      )?.[0] ?? null;
    const metrics = Array.from(
      metricArea?.querySelectorAll<HTMLElement>('[data-tt="components_ItemRow_TUXText"]') ?? [],
    ).map((element) => (element.textContent ?? "").trim());
    const privacy = (row.querySelector('button[data-tt*="PrivacyCell"]')?.textContent ?? "").trim();

    items.push({
      contentId: id,
      contentUrl: anchor.href,
      contentType: "video",
      title: (anchor.textContent ?? "").trim(),
      publishedDisplay: published,
      publishedAt: null,
      durationDisplay: duration,
      durationSeconds: null,
      viewsText: metrics[0] ?? null,
      likesText: metrics[1] ?? null,
      commentsText: metrics[2] ?? null,
      sharesText: null,
      savesText: null,
      notes: privacy ? [`privacy=${privacy}`] : [],
    });
    seen.add(id);
  }

  const firstUrl = items[0]?.contentUrl;
  const accountHandle = firstUrl?.match(/\/@([^/]+)\/video\//)?.[1] ?? "";
  return {
    ok: items.length > 0,
    platform: "tiktok",
    profile: accountHandle
      ? {
          accountName: accountHandle,
          accountHandle,
          followersText: null,
          followingText: null,
          totalPostsText: String(items.length),
          totalLikesText: null,
          notes: [],
        }
      : null,
    items,
    warningCodes: [],
    errorCode: items.length > 0 ? null : "LOGIN_OR_CONTENT_REQUIRED",
    errorMessage: items.length > 0 ? null : "TikTok Studio 콘텐츠를 찾지 못했습니다.",
  };
}

export function collectTikTokProfilePage(expectedHandle: string): RawProfile | null {
  const currentHandle = location.pathname.match(/^\/@([^/]+)/)?.[1] ?? "";
  if (!currentHandle || currentHandle.toLowerCase() !== expectedHandle.toLowerCase()) return null;
  const text = (selector: string) =>
    (document.querySelector<HTMLElement>(selector)?.textContent ?? "").trim() || null;
  const headings = Array.from(document.querySelectorAll<HTMLElement>("h1,h2"))
    .map((heading) => (heading.textContent ?? "").trim())
    .filter(Boolean);
  const accountName =
    headings.find((heading) => heading !== currentHandle)?.split("\n")[0] ?? currentHandle;
  const videoCount = new Set(
    Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/video/"]')).map(
      (anchor) => anchor.href.match(/\/video\/(\d+)/)?.[1],
    ),
  ).size;

  return {
    accountName,
    accountHandle: currentHandle,
    followersText: text('[data-e2e="followers-count"]'),
    followingText: text('[data-e2e="following-count"]'),
    totalPostsText: videoCount ? String(videoCount) : null,
    totalLikesText: text('[data-e2e="likes-count"]'),
    notes: [],
  };
}

export function detectInstagramHandle(): string | null {
  const candidates = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[href]"));
  for (const anchor of candidates) {
    const path = anchor.getAttribute("href") ?? "";
    const match = path.match(/^\/([^/?#]+)\/$/);
    const alt = anchor.querySelector("img")?.getAttribute("alt") ?? "";
    if (match?.[1] && /프로필 사진|profile picture/i.test(alt)) return match[1];
  }
  const meta =
    document.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? "";
  return meta.match(/@([A-Za-z0-9._]+)/)?.[1] ?? null;
}

export function collectInstagramProfilePage(expectedHandle: string): RawPlatformPayload {
  const currentHandle = location.pathname.split("/").filter(Boolean)[0] ?? "";
  const metaDescription =
    document.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? "";
  const metaTitle =
    document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? document.title;
  const counts = metaDescription.match(
    /팔로워\s*([\d.,KMB만천]+)명?,\s*팔로잉\s*([\d.,KMB만천]+)명?,\s*게시물\s*([\d.,KMB만천]+)개/,
  );
  const accountName = metaTitle.match(/^([^(@]+)\s*\(@/)?.[1]?.trim() || expectedHandle;
  const items: RawContentItem[] = [];
  const seen = new Set<string>();

  for (const anchor of Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a[href*="/reel/"]'),
  )) {
    const id = anchor.href.match(/\/reel\/([^/?#]+)/)?.[1];
    if (!id || seen.has(id)) continue;
    const owner = anchor.href.match(/instagram\.com\/([^/]+)\/reel\//)?.[1];
    if (owner && owner.toLowerCase() !== expectedHandle.toLowerCase()) continue;
    items.push({
      contentId: id,
      contentUrl: anchor.href,
      contentType: "reel",
      title: anchor.querySelector("img")?.getAttribute("alt")?.trim() ?? "",
      publishedDisplay: null,
      publishedAt: null,
      durationDisplay: null,
      durationSeconds: null,
      viewsText: null,
      likesText: null,
      commentsText: null,
      sharesText: null,
      savesText: null,
      notes: [],
    });
    seen.add(id);
  }

  const profileMatches = currentHandle.toLowerCase() === expectedHandle.toLowerCase();
  return {
    ok: profileMatches && (counts !== null || items.length > 0),
    platform: "instagram",
    profile: profileMatches
      ? {
          accountName,
          accountHandle: expectedHandle,
          followersText: counts?.[1] ?? null,
          followingText: counts?.[2] ?? null,
          totalPostsText: counts?.[3] ?? (items.length ? String(items.length) : null),
          totalLikesText: null,
          notes: [],
        }
      : null,
    items,
    warningCodes: [],
    errorCode: profileMatches ? null : "ACCOUNT_MISMATCH",
    errorMessage: profileMatches ? null : "Instagram 프로필 계정이 일치하지 않습니다.",
  };
}

export function collectInstagramReelPage(
  expectedHandle: string,
  expectedId: string,
): RawContentItem | null {
  const canonical =
    document.querySelector('meta[property="og:url"]')?.getAttribute("content") ?? location.href;
  if (!canonical.includes(`/reel/${expectedId}/`) && !canonical.includes(`/p/${expectedId}/`))
    return null;
  const description =
    document.querySelector('meta[property="og:description"]')?.getAttribute("content") ?? "";
  const match = description.match(
    /^([\d.,KMB만천]+)\s+likes?,\s*([\d.,KMB만천]+)\s+comments?\s+-\s+([A-Za-z0-9._]+)\s+-\s+([^:]+):\s+"([\s\S]*)"\.\s*$/i,
  );
  if (!match || match[3]?.toLowerCase() !== expectedHandle.toLowerCase()) return null;
  const video = document.querySelector<HTMLVideoElement>("video");
  const duration = video && Number.isFinite(video.duration) ? Math.round(video.duration) : null;
  return {
    contentId: expectedId,
    contentUrl: canonical,
    contentType: "reel",
    title: (match[5] ?? "").trim(),
    publishedDisplay: match[4]?.trim() ?? null,
    publishedAt: null,
    durationDisplay: null,
    durationSeconds: duration,
    viewsText: null,
    likesText: match[1] ?? null,
    commentsText: match[2] ?? null,
    sharesText: null,
    savesText: null,
    notes: [],
  };
}

export function detectXHandle(): string | null {
  const direct = document.querySelector<HTMLAnchorElement>(
    'a[data-testid="AppTabBar_Profile_Link"]',
  );
  const directMatch = direct?.getAttribute("href")?.match(/^\/([^/?#]+)/)?.[1];
  if (directMatch) return directMatch;
  const titleMatch = document.title.match(/@([A-Za-z0-9_]+)/);
  return titleMatch?.[1] ?? null;
}

export function collectXProfilePage(expectedHandle: string): RawPlatformPayload {
  const expectedLower = expectedHandle.toLowerCase();
  const items: RawContentItem[] = [];
  const seen = new Set<string>();
  const numberFromAria = (value: string | null) => value?.match(/^([\d.,KMB만천]+)/)?.[1] ?? null;

  for (const article of Array.from(document.querySelectorAll<HTMLElement>("article"))) {
    const links = Array.from(article.querySelectorAll<HTMLAnchorElement>('a[href*="/status/"]'));
    const statusLink = links.find((link) => {
      const match = link.getAttribute("href")?.match(/^\/([^/]+)\/status\/(\d+)$/);
      return match?.[1]?.toLowerCase() === expectedLower;
    });
    const match = statusLink?.getAttribute("href")?.match(/^\/([^/]+)\/status\/(\d+)$/);
    const id = match?.[2];
    if (!id || seen.has(id)) continue;

    const aria = (selector: string) =>
      article.querySelector(selector)?.getAttribute("aria-label") ?? null;
    const title = (
      article.querySelector<HTMLElement>('[data-testid="tweetText"]')?.textContent ?? ""
    ).trim();
    const time = article.querySelector<HTMLTimeElement>("time");
    const video = article.querySelector<HTMLVideoElement>("video");
    const viewsLink = links.find((link) => link.getAttribute("href")?.endsWith("/analytics"));
    items.push({
      contentId: id,
      contentUrl: `https://x.com/${match?.[1]}/status/${id}`,
      contentType: video ? "video_post" : "post",
      title,
      publishedDisplay: time?.textContent?.trim() ?? null,
      publishedAt: time?.dateTime || null,
      durationDisplay: null,
      durationSeconds: video && Number.isFinite(video.duration) ? Math.round(video.duration) : null,
      viewsText: numberFromAria(viewsLink?.getAttribute("aria-label") ?? null),
      likesText: numberFromAria(aria('[data-testid="like"]')),
      commentsText: numberFromAria(aria('[data-testid="reply"]')),
      sharesText: numberFromAria(aria('[data-testid="retweet"]')),
      savesText: null,
      notes: [],
    });
    seen.add(id);
  }

  const mainText = (document.querySelector("main")?.textContent ?? "").replace(/\s+/g, " ");
  const followingLink = document.querySelector<HTMLAnchorElement>(
    `a[href="/${expectedHandle}/following"]`,
  );
  const followerLink =
    document.querySelector<HTMLAnchorElement>(`a[href="/${expectedHandle}/verified_followers"]`) ??
    document.querySelector<HTMLAnchorElement>(`a[href="/${expectedHandle}/followers"]`);
  const title =
    document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? document.title;
  const accountName = title.match(/^([^(@]+)\s*\(@/)?.[1]?.trim() || expectedHandle;
  const pathHandle = location.pathname.split("/").filter(Boolean)[0] ?? "";
  const profileMatches = pathHandle.toLowerCase() === expectedLower;

  return {
    ok: profileMatches,
    platform: "x",
    profile: profileMatches
      ? {
          accountName,
          accountHandle: expectedHandle,
          followersText: followerLink?.textContent?.match(/[\d.,KMB만천]+/)?.[0] ?? null,
          followingText: followingLink?.textContent?.match(/[\d.,KMB만천]+/)?.[0] ?? null,
          totalPostsText: mainText.match(/([\d.,KMB만천]+)\s*게시물/)?.[1] ?? null,
          totalLikesText: null,
          notes: [],
        }
      : null,
    items,
    warningCodes: [],
    errorCode: profileMatches ? null : "ACCOUNT_MISMATCH",
    errorMessage: profileMatches ? null : "X 프로필 계정이 일치하지 않습니다.",
  };
}

export function scrollCollectionPage(): { before: number; after: number } {
  const before = document.documentElement.scrollHeight;
  window.scrollBy({ top: Math.max(window.innerHeight * 0.85, 700), behavior: "instant" });
  return { before, after: document.documentElement.scrollHeight };
}
