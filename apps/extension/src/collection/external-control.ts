import type { BrowserPlatform, CollectionRun } from "@creator-data-bridge/contracts";
import { exportCollectionCsv, getCollectionState, startCollection } from "./orchestrator";
import {
  collectionPreferencesStorageKey,
  defaultCollectionPreferences,
  normalizeCollectionPreferences,
} from "./preferences";

export const externalControlAlarmName = "creator-data-bridge.external-control";
const controlBaseUrl = "http://127.0.0.1:48765/v1";
const terminalSuccessStates = new Set(["partially_completed", "completed"]);
const terminalFailureStates = new Set(["failed", "cancelled"]);

interface ExternalControlJob {
  id: string;
  state: "pending" | "collecting";
  runId?: string;
}

let polling = false;

async function controlFetch(path: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);
  try {
    return await fetch(`${controlBaseUrl}${path}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function postJob(jobId: string, action: string, payload: unknown) {
  await controlFetch(`/jobs/${encodeURIComponent(jobId)}/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function enabledPlatforms(): Promise<BrowserPlatform[]> {
  const stored = await chrome.storage.local.get(collectionPreferencesStorageKey);
  const preferences = normalizeCollectionPreferences(
    stored[collectionPreferencesStorageKey] ?? defaultCollectionPreferences,
  );
  return preferences.enabledPlatforms;
}

function runFailure(run: CollectionRun) {
  const lastError = run.logs
    .slice()
    .reverse()
    .find((entry) => entry.level === "error");
  return {
    runId: run.id,
    state: run.state,
    error: lastError?.detail ?? "수집에 실패했습니다.",
    logs: run.logs,
  };
}

export async function pollExternalControl() {
  if (polling) return;
  polling = true;
  try {
    const response = await controlFetch("/job");
    if (response.status === 204) return;
    if (!response.ok) throw new Error(`Local control returned ${response.status}`);
    const job = (await response.json()) as ExternalControlJob;

    if (job.state === "pending") {
      const platforms = await enabledPlatforms();
      if (!platforms.length) {
        await postJob(job.id, "failed", {
          state: "failed",
          error: "수집 설정에서 하나 이상의 플랫폼을 활성화하세요.",
          logs: [],
        });
        return;
      }
      const run = await startCollection(platforms);
      await postJob(job.id, "accepted", {
        runId: run.id,
        platforms: run.requestedPlatforms,
      });
      return;
    }

    const state = await getCollectionState();
    const run = state.run;
    if (!run || run.id !== job.runId) return;
    if (terminalSuccessStates.has(run.state)) {
      const exported = await exportCollectionCsv(run.id);
      await postJob(job.id, "complete", {
        runId: run.id,
        state: run.state,
        fileName: exported.fileName,
        csv: exported.csv,
        logs: run.logs,
      });
    } else if (terminalFailureStates.has(run.state)) {
      await postJob(job.id, "failed", runFailure(run));
    }
  } catch {
    // The local controller is normally offline. Collection UI remains fully standalone.
  } finally {
    polling = false;
  }
}

export function ensureExternalControlAlarm() {
  chrome.alarms.create(externalControlAlarmName, { periodInMinutes: 0.5 });
}
