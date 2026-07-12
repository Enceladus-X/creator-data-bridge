import type { BrowserPlatform } from "@creator-data-bridge/contracts";

export const browserPlatforms: BrowserPlatform[] = ["youtube", "tiktok", "x", "instagram"];
export const collectionPreferencesStorageKey = "collection.preferences";

export interface CollectionPreferences {
  schemaVersion: 3;
  enabledPlatforms: BrowserPlatform[];
}

export const defaultCollectionPreferences: CollectionPreferences = {
  schemaVersion: 3,
  enabledPlatforms: [...browserPlatforms],
};

export function normalizeCollectionPreferences(value: unknown): CollectionPreferences {
  if (!value || typeof value !== "object") return defaultCollectionPreferences;
  const candidate = value as Omit<Partial<CollectionPreferences>, "schemaVersion"> & {
    schemaVersion?: number;
    itemLimit?: unknown;
  };
  const isLegacyPreference = candidate.schemaVersion !== 2 && candidate.schemaVersion !== 3;
  const storedPlatforms = Array.isArray(candidate.enabledPlatforms)
    ? candidate.enabledPlatforms
    : null;
  const enabledPlatforms = storedPlatforms
    ? browserPlatforms.filter(
        (platform) =>
          (isLegacyPreference && platform === "youtube") || storedPlatforms.includes(platform),
      )
    : defaultCollectionPreferences.enabledPlatforms;
  return { schemaVersion: 3, enabledPlatforms };
}
