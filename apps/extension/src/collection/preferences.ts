import type { BrowserPlatform } from "@creator-data-bridge/contracts";
import { type AppLocale, appLocales } from "../shared/i18n";

export const browserPlatforms: BrowserPlatform[] = ["youtube", "tiktok", "x", "instagram"];
export const collectionPreferencesStorageKey = "collection.preferences";

export interface CollectionPreferences {
  schemaVersion: 4;
  enabledPlatforms: BrowserPlatform[];
  locale: AppLocale;
}

export const defaultCollectionPreferences: CollectionPreferences = {
  schemaVersion: 4,
  enabledPlatforms: [...browserPlatforms],
  locale: "ko",
};

export function normalizeCollectionPreferences(value: unknown): CollectionPreferences {
  if (!value || typeof value !== "object") return defaultCollectionPreferences;
  const candidate = value as Omit<Partial<CollectionPreferences>, "schemaVersion"> & {
    schemaVersion?: number;
    itemLimit?: unknown;
  };
  const isLegacyPreference = ![2, 3, 4].includes(candidate.schemaVersion ?? 0);
  const storedPlatforms = Array.isArray(candidate.enabledPlatforms)
    ? candidate.enabledPlatforms
    : null;
  const enabledPlatforms = storedPlatforms
    ? browserPlatforms.filter(
        (platform) =>
          (isLegacyPreference && platform === "youtube") || storedPlatforms.includes(platform),
      )
    : defaultCollectionPreferences.enabledPlatforms;
  const locale = appLocales.includes(candidate.locale as AppLocale)
    ? (candidate.locale as AppLocale)
    : defaultCollectionPreferences.locale;
  return { schemaVersion: 4, enabledPlatforms, locale };
}
