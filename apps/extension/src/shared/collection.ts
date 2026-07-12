import type {
  BrowserPlatform,
  CollectionRun,
  CollectionSnapshot,
} from "@creator-data-bridge/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  browserPlatforms,
  type CollectionPreferences,
  collectionPreferencesStorageKey,
  defaultCollectionPreferences,
  normalizeCollectionPreferences,
} from "../collection/preferences";
import type {
  CollectionMessage,
  CollectionStateResponse,
  CsvExportResponse,
} from "../collection/types";
import { platformPermissionOrigins } from "../collection/types";

interface RuntimeResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

function runtimeAvailable() {
  return typeof chrome !== "undefined" && Boolean(chrome.runtime?.id);
}

async function sendMessage<T>(message: CollectionMessage): Promise<T> {
  if (!runtimeAvailable()) throw new Error("Chrome 확장프로그램에서만 수집할 수 있습니다.");
  const response = (await chrome.runtime.sendMessage(message)) as RuntimeResponse<T>;
  if (!response.ok || response.data === undefined) {
    throw new Error(response.error ?? "확장프로그램 요청에 실패했습니다.");
  }
  return response.data;
}

function saveCsvFile(payload: CsvExportResponse) {
  const url = URL.createObjectURL(new Blob([payload.csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = payload.fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function requestAllPlatformPermissions(platforms: BrowserPlatform[]) {
  if (!runtimeAvailable()) return false;
  return chrome.permissions.request({
    origins: platforms.map((platform) => platformPermissionOrigins[platform]),
  });
}

export function useBrowserCollection() {
  const [state, setState] = useState<CollectionStateResponse>({
    run: null,
    records: [],
    permissions: { youtube: false, tiktok: false, instagram: false, x: false },
  });
  const [loading, setLoading] = useState(true);
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferences, setPreferences] = useState<CollectionPreferences>(
    defaultCollectionPreferences,
  );
  const [autoDownloadArmed, setAutoDownloadArmed] = useState(false);
  const [autoExporting, setAutoExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<number | null>(null);
  const autoExportRunId = useRef<string | null>(null);

  useEffect(() => {
    if (!runtimeAvailable()) {
      setPreferencesLoading(false);
      return;
    }
    void chrome.storage.local
      .get(collectionPreferencesStorageKey)
      .then((result) => {
        setPreferences(normalizeCollectionPreferences(result[collectionPreferencesStorageKey]));
      })
      .catch(() => setError("수집 설정을 읽지 못했습니다."))
      .finally(() => setPreferencesLoading(false));
  }, []);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const next = await sendMessage<CollectionStateResponse>({ type: "COLLECTION_GET_STATE" });
      setState(next);
      setError(null);
      return next;
    } catch (refreshError) {
      setError(
        refreshError instanceof Error ? refreshError.message : "수집 상태를 읽지 못했습니다.",
      );
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const running = state.run ? ["preflight", "running"].includes(state.run.state) : false;

  useEffect(() => {
    void refresh();
    pollTimer.current = window.setInterval(() => void refresh(true), running ? 700 : 2_500);
    return () => {
      if (pollTimer.current !== null) window.clearInterval(pollTimer.current);
    };
  }, [refresh, running]);

  const start = useCallback(
    async (platforms: BrowserPlatform[], itemLimit: number) => {
      setError(null);
      try {
        const startedRun = await sendMessage<CollectionRun>({
          type: "COLLECTION_START",
          platforms,
          itemLimit,
        });
        autoExportRunId.current = startedRun.id;
        setAutoDownloadArmed(true);
        await refresh(true);
      } catch (startError) {
        setError(startError instanceof Error ? startError.message : "수집을 시작하지 못했습니다.");
      }
    },
    [refresh],
  );

  useEffect(() => {
    const run = state.run;
    if (!run || autoExportRunId.current !== run.id) return;
    if (["preflight", "running"].includes(run.state)) return;
    if (run.state === "cancelled") {
      autoExportRunId.current = null;
      setAutoDownloadArmed(false);
      return;
    }
    if (!["completed", "partially_completed", "failed"].includes(run.state)) return;

    const targetRunId = autoExportRunId.current;
    autoExportRunId.current = null;
    setAutoDownloadArmed(false);
    if (state.records.length === 0) {
      setError("수집된 데이터가 없어 CSV를 만들지 못했습니다.");
      return;
    }

    setAutoExporting(true);
    void sendMessage<CsvExportResponse>({
      type: "COLLECTION_EXPORT_CSV",
      runId: targetRunId,
    })
      .then((payload) => {
        saveCsvFile(payload);
        setError(null);
      })
      .catch((exportError) =>
        setError(exportError instanceof Error ? exportError.message : "CSV를 저장하지 못했습니다."),
      )
      .finally(() => setAutoExporting(false));
  }, [state.records, state.run]);

  const cancel = useCallback(async () => {
    if (!state.run) return;
    try {
      await sendMessage<CollectionRun | null>({
        type: "COLLECTION_CANCEL",
        runId: state.run.id,
      });
      await refresh(true);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "수집을 중단하지 못했습니다.");
    }
  }, [refresh, state.run]);

  const retry = useCallback(
    async (platform: BrowserPlatform) => {
      if (!state.run) return;
      try {
        await sendMessage<CollectionRun>({
          type: "COLLECTION_RETRY_PLATFORM",
          runId: state.run.id,
          platform,
        });
        await refresh(true);
      } catch (retryError) {
        setError(retryError instanceof Error ? retryError.message : "다시 수집하지 못했습니다.");
      }
    },
    [refresh, state.run],
  );

  const exportCsv = useCallback(async () => {
    try {
      const payload = await sendMessage<CsvExportResponse>({
        type: "COLLECTION_EXPORT_CSV",
        runId: state.run?.id,
      });
      saveCsvFile(payload);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "CSV를 저장하지 못했습니다.");
    }
  }, [state.run]);

  const clear = useCallback(async () => {
    try {
      await sendMessage<{ ok: true }>({ type: "COLLECTION_CLEAR_DATA" });
      await refresh(true);
    } catch (clearError) {
      setError(
        clearError instanceof Error ? clearError.message : "수집 기록을 삭제하지 못했습니다.",
      );
    }
  }, [refresh]);

  const persistPreferences = useCallback((next: CollectionPreferences) => {
    setPreferences(next);
    if (!runtimeAvailable()) return;
    void chrome.storage.local
      .set({ [collectionPreferencesStorageKey]: next })
      .catch(() => setError("수집 설정을 저장하지 못했습니다."));
  }, []);

  const togglePlatform = useCallback(
    (platform: BrowserPlatform) => {
      const enabled = preferences.enabledPlatforms.includes(platform);
      persistPreferences({
        ...preferences,
        enabledPlatforms: enabled
          ? preferences.enabledPlatforms.filter((item) => item !== platform)
          : browserPlatforms.filter(
              (item) => item === platform || preferences.enabledPlatforms.includes(item),
            ),
      });
    },
    [persistPreferences, preferences],
  );

  const setItemLimit = useCallback(
    (itemLimit: CollectionPreferences["itemLimit"]) => {
      persistPreferences({ ...preferences, itemLimit });
    },
    [persistPreferences, preferences],
  );

  const snapshot: CollectionSnapshot = useMemo(
    () => ({ run: state.run, records: state.records }),
    [state.records, state.run],
  );

  return {
    snapshot,
    permissions: state.permissions,
    loading,
    preferencesLoading,
    running,
    preferences,
    autoDownloadArmed,
    autoExporting,
    error,
    refresh,
    start,
    cancel,
    retry,
    exportCsv,
    clear,
    togglePlatform,
    setItemLimit,
  };
}
