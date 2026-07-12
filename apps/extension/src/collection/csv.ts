import type { CollectionRecord } from "@creator-data-bridge/contracts";

export const collectionCsvHeaders = [
  "schema_version",
  "run_id",
  "snapshot_at",
  "platform",
  "account_name",
  "account_handle",
  "record_type",
  "content_id",
  "content_url",
  "content_type",
  "title",
  "published_at",
  "duration_seconds",
  "views",
  "views_coverage",
  "likes",
  "likes_coverage",
  "comments",
  "comments_coverage",
  "shares",
  "shares_coverage",
  "saves",
  "saves_coverage",
  "followers",
  "following",
  "total_posts",
  "source_surface",
  "selector_version",
  "notes",
] as const;

function escapeCsv(value: string | number | null) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function recordValues(record: CollectionRecord): Array<string | number | null> {
  return [
    record.schemaVersion,
    record.runId,
    record.snapshotAt,
    record.platform,
    record.accountName,
    record.accountHandle,
    record.recordType,
    record.contentId,
    record.contentUrl,
    record.contentType,
    record.title,
    record.publishedAt,
    record.durationSeconds,
    record.views,
    record.viewsCoverage,
    record.likes,
    record.likesCoverage,
    record.comments,
    record.commentsCoverage,
    record.shares,
    record.sharesCoverage,
    record.saves,
    record.savesCoverage,
    record.followers,
    record.following,
    record.totalPosts,
    record.sourceSurface,
    record.selectorVersion,
    record.notes,
  ];
}

export function buildCollectionCsv(records: CollectionRecord[]) {
  const lines = [
    collectionCsvHeaders.map(escapeCsv).join(","),
    ...records.map((record) => recordValues(record).map(escapeCsv).join(",")),
  ];
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function buildCollectionFileName(records: CollectionRecord[], now = new Date()) {
  const handle = records[0]?.accountHandle.replace(/^@/, "") || "creator";
  const timestamp = now
    .toISOString()
    .replaceAll(":", "")
    .replaceAll("-", "")
    .replace(/\.\d{3}Z$/, "Z");
  return `creator-data-bridge_${handle}_${timestamp}.csv`;
}
