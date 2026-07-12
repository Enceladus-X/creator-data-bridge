import type { BrowserPlatform } from "@creator-data-bridge/contracts";

export const browserPlatforms: BrowserPlatform[] = ["tiktok", "x", "instagram"];
export const collectionPreferencesStorageKey = "collection.preferences";

export interface CollectionPreferences {
  enabledPlatforms: BrowserPlatform[];
  itemLimit: 50 | 100 | 250 | 500;
}

export const defaultCollectionPreferences: CollectionPreferences = {
  enabledPlatforms: [...browserPlatforms],
  itemLimit: 100,
};

export function normalizeCollectionPreferences(value: unknown): CollectionPreferences {
  if (!value || typeof value !== "object") return defaultCollectionPreferences;
  const candidate = value as Partial<CollectionPreferences>;
  const enabledPlatforms = Array.isArray(candidate.enabledPlatforms)
    ? browserPlatforms.filter((platform) => candidate.enabledPlatforms?.includes(platform))
    : defaultCollectionPreferences.enabledPlatforms;
  const itemLimit = [50, 100, 250, 500].includes(candidate.itemLimit ?? 0)
    ? (candidate.itemLimit as CollectionPreferences["itemLimit"])
    : defaultCollectionPreferences.itemLimit;
  return { enabledPlatforms, itemLimit };
}
