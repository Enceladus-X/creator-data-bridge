import type {
  BrowserPlatform,
  CollectionRecord,
  CollectionRun,
} from "@creator-data-bridge/contracts";

export interface RawProfile {
  accountName: string;
  accountHandle: string;
  followersText: string | null;
  followingText: string | null;
  totalPostsText: string | null;
  totalLikesText: string | null;
  channelViewsText?: string | null;
  watchHoursText?: string | null;
  notes: string[];
}

export interface RawContentItem {
  contentId: string;
  contentUrl: string;
  contentType: string;
  title: string;
  publishedDisplay: string | null;
  publishedAt: string | null;
  durationDisplay: string | null;
  durationSeconds: number | null;
  viewsText: string | null;
  likesText: string | null;
  commentsText: string | null;
  sharesText: string | null;
  savesText: string | null;
  notes: string[];
}

export interface RawPlatformPayload {
  ok: boolean;
  platform: BrowserPlatform;
  profile: RawProfile | null;
  items: RawContentItem[];
  warningCodes: string[];
  errorCode: string | null;
  errorMessage: string | null;
}

export interface CollectionStateResponse {
  run: CollectionRun | null;
  records: CollectionRecord[];
  permissions: Record<BrowserPlatform, boolean>;
}

export type CollectionMessage =
  | { type: "COLLECTION_GET_STATE" }
  | { type: "COLLECTION_START"; platforms?: BrowserPlatform[]; itemLimit?: number }
  | { type: "COLLECTION_CANCEL"; runId: string }
  | { type: "COLLECTION_RETRY_PLATFORM"; runId: string; platform: BrowserPlatform }
  | { type: "COLLECTION_EXPORT_CSV"; runId?: string }
  | { type: "COLLECTION_CLEAR_DATA" }
  | { type: "OPEN_DASHBOARD"; view?: string };

export interface CsvExportResponse {
  fileName: string;
  csv: string;
}

export const platformPermissionOrigins: Record<BrowserPlatform, string> = {
  youtube: "https://studio.youtube.com/*",
  tiktok: "https://www.tiktok.com/*",
  instagram: "https://www.instagram.com/*",
  x: "https://x.com/*",
};
