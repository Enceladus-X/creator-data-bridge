import type { BrowserPlatform } from "@creator-data-bridge/contracts";

export const browserPlatforms: BrowserPlatform[] = ["youtube", "tiktok", "x", "instagram"];
export const collectionPreferencesStorageKey = "collection.preferences";

export interface CollectionPreferences {
  schemaVersion: 2;
  enabledPlatforms: BrowserPlatform[];
  itemLimit: 50 | 100 | 250 | 500;
}

export const defaultCollectionPreferences: CollectionPreferences = {
  schemaVersion: 2,
  enabledPlatforms: [...browserPlatforms],
  itemLimit: 100,
};

export function normalizeCollectionPreferences(value: unknown): CollectionPreferences {
  if (!value || typeof value !== "object") return defaultCollectionPreferences;
  const candidate = value as Partial<CollectionPreferences>;
  const isLegacyPreference = candidate.schemaVersion !== 2;
  const storedPlatforms = Array.isArray(candidate.enabledPlatforms)
    ? candidate.enabledPlatforms
    : null;
  const enabledPlatforms = storedPlatforms
    ? browserPlatforms.filter(
        (platform) =>
          (isLegacyPreference && platform === "youtube") || storedPlatforms.includes(platform),
      )
    : defaultCollectionPreferences.enabledPlatforms;
  const itemLimit = [50, 100, 250, 500].includes(candidate.itemLimit ?? 0)
    ? (candidate.itemLimit as CollectionPreferences["itemLimit"])
    : defaultCollectionPreferences.itemLimit;
  return { schemaVersion: 2, enabledPlatforms, itemLimit };
}
