type DashboardTarget =
  | "settings"
  | "settings/youtube"
  | "settings/instagram"
  | "settings/tiktok"
  | "settings/x";

export function openDashboard(view?: DashboardTarget) {
  const hash = view ? `#${view}` : "";
  if (typeof chrome !== "undefined" && chrome.runtime?.id) {
    void chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD", view });
    return;
  }
  window.location.assign(`/dashboard.html${hash}`);
}

export async function openCollectionPanel() {
  try {
    if (typeof chrome === "undefined" || !chrome.runtime?.id || !chrome.sidePanel) return false;
    const currentWindow = await chrome.windows.getCurrent();
    if (currentWindow.id === undefined) return false;
    await chrome.sidePanel.open({ windowId: currentWindow.id });
    return true;
  } catch {
    return false;
  }
}

export function downloadJson(fileName: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function copyText(value: string) {
  try {
    if (!navigator.clipboard) {
      throw new Error("Clipboard API is unavailable.");
    }
    await Promise.race([
      navigator.clipboard.writeText(value),
      new Promise<never>((_, reject) =>
        window.setTimeout(() => reject(new Error("Clipboard write timed out.")), 750),
      ),
    ]);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }
}
