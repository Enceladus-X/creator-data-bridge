export function openDashboard(view?: "settings") {
  const hash = view ? `#${view}` : "";
  if (typeof chrome !== "undefined" && chrome.runtime?.id) {
    void chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD", view });
    return;
  }
  window.location.assign(`/dashboard.html${hash}`);
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
    await navigator.clipboard.writeText(value);
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
