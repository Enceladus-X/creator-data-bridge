import type { BrowserPlatform } from "@creator-data-bridge/contracts";
import {
  ensureExternalControlAlarm,
  externalControlAlarmName,
  pollExternalControl,
} from "./collection/external-control";
import {
  cancelCollection,
  clearCollectionData,
  exportCollectionCsv,
  getCollectionState,
  recoverInterruptedCollection,
  retryCollectionPlatform,
  startCollection,
} from "./collection/orchestrator";
import type { CollectionMessage } from "./collection/types";

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  ensureExternalControlAlarm();
});

chrome.runtime.onStartup.addListener(() => {
  void recoverInterruptedCollection();
  ensureExternalControlAlarm();
  void pollExternalControl();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === externalControlAlarmName) void pollExternalControl();
});

ensureExternalControlAlarm();
void pollExternalControl();

async function handleMessage(message: CollectionMessage) {
  if (message.type === "OPEN_DASHBOARD") {
    const view =
      typeof message.view === "string" &&
      /^settings(?:\/(?:youtube|instagram|tiktok|x))?$/.test(message.view)
        ? `#${message.view}`
        : "";
    await chrome.tabs.create({ url: chrome.runtime.getURL(`dashboard.html${view}`) });
    return { ok: true };
  }
  if (message.type === "COLLECTION_GET_STATE") return getCollectionState();
  if (message.type === "COLLECTION_START") {
    return startCollection(message.platforms as BrowserPlatform[] | undefined);
  }
  if (message.type === "COLLECTION_CANCEL") return cancelCollection(message.runId);
  if (message.type === "COLLECTION_RETRY_PLATFORM") {
    return retryCollectionPlatform(message.runId, message.platform);
  }
  if (message.type === "COLLECTION_EXPORT_CSV") return exportCollectionCsv(message.runId);
  if (message.type === "COLLECTION_CLEAR_DATA") {
    await clearCollectionData();
    return { ok: true };
  }
  return { ok: false, error: "UNKNOWN_MESSAGE" };
}

chrome.runtime.onMessage.addListener((message: CollectionMessage, _sender, sendResponse) => {
  void handleMessage(message)
    .then((result) => sendResponse({ ok: true, data: result }))
    .catch((error) =>
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "요청을 처리하지 못했습니다.",
      }),
    );
  return true;
});
