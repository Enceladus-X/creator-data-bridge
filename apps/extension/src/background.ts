chrome.runtime.onInstalled.addListener(async () => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
});

chrome.runtime.onMessage.addListener((message: unknown) => {
  if (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    message.type === "OPEN_DASHBOARD"
  ) {
    const view = "view" in message && message.view === "settings" ? "#settings" : "";
    void chrome.tabs.create({ url: chrome.runtime.getURL(`dashboard.html${view}`) });
  }
});
