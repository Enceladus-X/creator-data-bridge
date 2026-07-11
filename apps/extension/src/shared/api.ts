import {
  type YouTubeDashboardResponse,
  youtubeDashboardResponseSchema,
} from "@creator-data-bridge/contracts";
import { useCallback, useEffect, useRef, useState } from "react";

export type ApiState = "checking" | "online" | "offline";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787";

interface ApiErrorPayload {
  error?: { code?: string; message?: string };
}

export class ApiRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
    throw new ApiRequestError(
      payload.error?.code ?? "API_ERROR",
      payload.error?.message ?? "요청을 완료하지 못했습니다.",
      response.status,
    );
  }
  return (await response.json()) as T;
}

function openExternal(url: string) {
  if (typeof chrome !== "undefined" && chrome.tabs?.create) {
    void chrome.tabs.create({ url });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export function useApiHealth() {
  const [state, setState] = useState<ApiState>("checking");

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);

    fetch(`${apiBaseUrl}/health`, { signal: controller.signal })
      .then((response) => setState(response.ok ? "online" : "offline"))
      .catch(() => setState("offline"))
      .finally(() => window.clearTimeout(timeout));

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return state;
}

export function useYouTubeDashboard() {
  const [data, setData] = useState<YouTubeDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<number | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    try {
      const response = youtubeDashboardResponseSchema.parse(
        await request<YouTubeDashboardResponse>("/v1/youtube"),
      );
      setData(response);
      setError(null);
      if (response.connection.connected && pollTimer.current !== null) {
        window.clearInterval(pollTimer.current);
        pollTimer.current = null;
        setConnecting(false);
      }
      return response;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "상태 조회에 실패했습니다.");
      return null;
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      if (pollTimer.current !== null) {
        window.clearInterval(pollTimer.current);
      }
    };
  }, [refresh]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const response = await request<{ authorizationUrl: string }>("/v1/youtube/connect", {
        method: "POST",
      });
      openExternal(response.authorizationUrl);
      if (pollTimer.current !== null) {
        window.clearInterval(pollTimer.current);
      }
      pollTimer.current = window.setInterval(() => void refresh(true), 2000);
      window.setTimeout(() => {
        if (pollTimer.current !== null) {
          window.clearInterval(pollTimer.current);
          pollTimer.current = null;
          setConnecting(false);
        }
      }, 120_000);
    } catch (requestError) {
      setConnecting(false);
      setError(
        requestError instanceof Error ? requestError.message : "연결을 시작하지 못했습니다.",
      );
    }
  }, [refresh]);

  const sync = useCallback(async (days: number) => {
    setSyncing(true);
    setError(null);
    try {
      const response = youtubeDashboardResponseSchema.parse(
        await request<YouTubeDashboardResponse>(`/v1/youtube/sync?days=${days}`, {
          method: "POST",
        }),
      );
      setData(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "동기화에 실패했습니다.");
    } finally {
      setSyncing(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setError(null);
    try {
      const response = youtubeDashboardResponseSchema.parse(
        await request<YouTubeDashboardResponse>("/v1/youtube/connect", { method: "DELETE" }),
      );
      setData(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "연결 해제에 실패했습니다.");
    }
  }, []);

  return { data, loading, syncing, connecting, error, refresh, connect, sync, disconnect };
}
