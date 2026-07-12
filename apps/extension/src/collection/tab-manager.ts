const pageReadyTimeoutMs = 20_000;

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export interface ManagedCollectionTab {
  tabId: number;
  restoreTabId: number | null;
}

export async function createCollectionTab(url: string): Promise<ManagedCollectionTab> {
  const active = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  const tab = await chrome.tabs.create({ url, active: false });
  if (tab.id === undefined) throw new Error("임시 수집 탭을 만들지 못했습니다.");
  await waitForTabReady(tab.id);
  return { tabId: tab.id, restoreTabId: active[0]?.id ?? null };
}

export async function navigateCollectionTab(tabId: number, url: string) {
  await chrome.tabs.update(tabId, { url, active: false });
  await waitForTabReady(tabId);
}

export async function waitForTabReady(tabId: number) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < pageReadyTimeoutMs) {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === "complete") {
      await sleep(450);
      return;
    }
    await sleep(200);
  }
  throw new Error("페이지 로딩 시간이 초과되었습니다.");
}

export async function executeCollector<TResult, TArgs extends unknown[]>(
  tabId: number,
  func: (...args: TArgs) => TResult,
  args: TArgs,
): Promise<TResult> {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args,
  });
  return result?.result as TResult;
}

export async function activateCollectionTab(tab: ManagedCollectionTab) {
  await chrome.tabs.update(tab.tabId, { active: true });
  await sleep(900);
}

export async function closeCollectionTab(tab: ManagedCollectionTab) {
  await chrome.tabs.remove(tab.tabId).catch(() => undefined);
  if (tab.restoreTabId !== null) {
    await chrome.tabs.update(tab.restoreTabId, { active: true }).catch(() => undefined);
  }
}

export async function collectionDelay(milliseconds: number) {
  await sleep(milliseconds);
}
