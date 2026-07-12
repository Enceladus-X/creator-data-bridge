import { z } from "zod";

export const platformSchema = z.enum(["youtube", "instagram", "tiktok", "x"]);
export type Platform = z.infer<typeof platformSchema>;

export const connectorStateSchema = z.enum(["available", "planned", "degraded", "unavailable"]);
export type ConnectorState = z.infer<typeof connectorStateSchema>;

export const coverageSchema = z.enum([
  "complete",
  "partial",
  "delayed",
  "thresholded",
  "snapshot_derived",
  "unsupported",
  "unavailable",
]);
export type Coverage = z.infer<typeof coverageSchema>;

export const metricMethodSchema = z.enum([
  "provider_reported",
  "snapshot_derived",
  "formula_derived",
]);
export type MetricMethod = z.infer<typeof metricMethodSchema>;

export const platformCapabilitySchema = z.object({
  platform: platformSchema,
  state: connectorStateSchema,
  label: z.string().min(1),
  description: z.string().min(1),
  supportedScopes: z.array(z.string()),
});
export type PlatformCapability = z.infer<typeof platformCapabilitySchema>;

export const metricObservationSchema = z
  .object({
    metricId: z.string().min(1),
    value: z.number().finite().nullable(),
    unit: z.enum(["count", "seconds", "minutes", "percent", "currency"]),
    scope: z.enum(["account_snapshot", "account_period", "content_snapshot", "content_period"]),
    platform: platformSchema,
    periodStart: z.string().min(1).optional(),
    periodEnd: z.string().min(1).optional(),
    source: z.string().min(1),
    method: metricMethodSchema,
    collectedAt: z.string().min(1),
    coverage: coverageSchema,
    formulaId: z.string().min(1).optional(),
  })
  .superRefine((observation, context) => {
    const requiresValue = ["complete", "partial", "delayed", "snapshot_derived"].includes(
      observation.coverage,
    );

    if (requiresValue && observation.value === null) {
      context.addIssue({
        code: "custom",
        message: `Coverage ${observation.coverage} requires a numeric value`,
        path: ["value"],
      });
    }

    if (observation.coverage === "unsupported" && observation.value !== null) {
      context.addIssue({
        code: "custom",
        message: "Unsupported metrics cannot carry a numeric value",
        path: ["value"],
      });
    }
  });
export type MetricObservation = z.infer<typeof metricObservationSchema>;

export const syncRunStateSchema = z.enum([
  "queued",
  "running",
  "partially_completed",
  "completed",
  "failed",
]);
export type SyncRunState = z.infer<typeof syncRunStateSchema>;

export const syncRunSchema = z.object({
  id: z.string().min(1),
  state: syncRunStateSchema,
  platforms: z.array(platformSchema).min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  createdAt: z.string().min(1),
  completedAt: z.string().min(1).nullable(),
});
export type SyncRun = z.infer<typeof syncRunSchema>;

export const connectionStateSchema = z.enum([
  "not_configured",
  "disconnected",
  "connected",
  "error",
]);
export type ConnectionState = z.infer<typeof connectionStateSchema>;

export const youtubeConnectionSchema = z.object({
  platform: z.literal("youtube"),
  configured: z.boolean(),
  connected: z.boolean(),
  state: connectionStateSchema,
  lastConnectedAt: z.string().nullable(),
});
export type YouTubeConnection = z.infer<typeof youtubeConnectionSchema>;

export const dashboardAccountSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  thumbnailUrl: z.string().nullable(),
  subscriberCount: z.number().nonnegative().nullable(),
  totalViewCount: z.number().nonnegative(),
  videoCount: z.number().nonnegative(),
});
export type DashboardAccount = z.infer<typeof dashboardAccountSchema>;

export const dashboardSummarySchema = z.object({
  views: z.number().nonnegative().nullable(),
  watchTimeMinutes: z.number().nonnegative().nullable(),
  averageViewDurationSeconds: z.number().nonnegative().nullable(),
  subscribersGained: z.number().nonnegative().nullable(),
  subscribersLost: z.number().nonnegative().nullable(),
  subscriberNet: z.number().nullable(),
  likes: z.number().nonnegative().nullable(),
  comments: z.number().nonnegative().nullable(),
  shares: z.number().nonnegative().nullable(),
  contentPublished: z.number().nonnegative(),
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

export const dashboardDailyPointSchema = z.object({
  day: z.string().min(1),
  views: z.number().nonnegative(),
  watchTimeMinutes: z.number().nonnegative(),
  subscriberNet: z.number(),
});
export type DashboardDailyPoint = z.infer<typeof dashboardDailyPointSchema>;

export const dashboardContentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
  thumbnailUrl: z.string().nullable(),
  publishedAt: z.string().nullable(),
  views: z.number().nonnegative(),
  watchTimeMinutes: z.number().nonnegative(),
  averageViewDurationSeconds: z.number().nonnegative(),
  likes: z.number().nonnegative(),
  comments: z.number().nonnegative(),
  shares: z.number().nonnegative(),
  subscribersGained: z.number().nonnegative(),
});
export type DashboardContent = z.infer<typeof dashboardContentSchema>;

export const dashboardWarningSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
});
export type DashboardWarning = z.infer<typeof dashboardWarningSchema>;

export const youtubeDashboardSnapshotSchema = z.object({
  platform: z.literal("youtube"),
  rangeDays: z.number().int().min(1).max(365),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  lastSyncedAt: z.string().min(1),
  account: dashboardAccountSchema,
  summary: dashboardSummarySchema,
  daily: z.array(dashboardDailyPointSchema),
  topContent: z.array(dashboardContentSchema),
  warnings: z.array(dashboardWarningSchema),
});
export type YouTubeDashboardSnapshot = z.infer<typeof youtubeDashboardSnapshotSchema>;

export const youtubeDashboardResponseSchema = z.object({
  connection: youtubeConnectionSchema,
  snapshot: youtubeDashboardSnapshotSchema.nullable(),
});
export type YouTubeDashboardResponse = z.infer<typeof youtubeDashboardResponseSchema>;

export const browserPlatformSchema = z.enum(["youtube", "tiktok", "instagram", "x"]);
export type BrowserPlatform = z.infer<typeof browserPlatformSchema>;

export const collectionRecordTypeSchema = z.enum(["channel_summary", "content"]);
export type CollectionRecordType = z.infer<typeof collectionRecordTypeSchema>;

export const collectionValueCoverageSchema = z.enum([
  "complete",
  "partial",
  "unavailable",
  "unsupported",
]);
export type CollectionValueCoverage = z.infer<typeof collectionValueCoverageSchema>;

const nullableCountSchema = z.number().finite().nonnegative().nullable();

export const collectionRecordSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  runId: z.string().min(1),
  snapshotAt: z.string().datetime({ offset: true }),
  platform: platformSchema,
  accountName: z.string(),
  accountHandle: z.string().min(1),
  recordType: collectionRecordTypeSchema,
  contentId: z.string(),
  contentUrl: z.string(),
  contentType: z.string(),
  title: z.string(),
  publishedAt: z.string().nullable(),
  durationSeconds: nullableCountSchema,
  views: nullableCountSchema,
  viewsCoverage: collectionValueCoverageSchema,
  likes: nullableCountSchema,
  likesCoverage: collectionValueCoverageSchema,
  comments: nullableCountSchema,
  commentsCoverage: collectionValueCoverageSchema,
  shares: nullableCountSchema,
  sharesCoverage: collectionValueCoverageSchema,
  saves: nullableCountSchema,
  savesCoverage: collectionValueCoverageSchema,
  followers: nullableCountSchema,
  following: nullableCountSchema,
  totalPosts: nullableCountSchema,
  sourceSurface: z.string().min(1),
  selectorVersion: z.string().min(1),
  notes: z.string(),
});
export type CollectionRecord = z.infer<typeof collectionRecordSchema>;

export const platformCollectionStateSchema = z.enum([
  "pending",
  "opening",
  "waiting",
  "collecting",
  "normalizing",
  "completed",
  "failed",
  "cancelled",
]);
export type PlatformCollectionState = z.infer<typeof platformCollectionStateSchema>;

export const platformCheckpointSchema = z.object({
  platform: browserPlatformSchema,
  state: platformCollectionStateSchema,
  accountHandle: z.string().nullable(),
  discovered: z.number().int().nonnegative(),
  rowsWritten: z.number().int().nonnegative(),
  warningCodes: z.array(z.string()),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  lastHeartbeatAt: z.string().datetime({ offset: true }).nullable(),
});
export type PlatformCheckpoint = z.infer<typeof platformCheckpointSchema>;

export const collectionRunStateSchema = z.enum([
  "preflight",
  "running",
  "partially_completed",
  "completed",
  "failed",
  "cancelled",
]);
export type CollectionRunState = z.infer<typeof collectionRunStateSchema>;

export const collectionLogLevelSchema = z.enum(["info", "success", "warning", "error"]);
export type CollectionLogLevel = z.infer<typeof collectionLogLevelSchema>;

export const collectionLogEntrySchema = z.object({
  id: z.string().min(1),
  at: z.string().datetime({ offset: true }),
  level: collectionLogLevelSchema,
  platform: browserPlatformSchema.nullable(),
  message: z.string().min(1),
  detail: z.string().nullable(),
});
export type CollectionLogEntry = z.infer<typeof collectionLogEntrySchema>;

export const collectionRunSchema = z.object({
  id: z.string().min(1),
  state: collectionRunStateSchema,
  requestedPlatforms: z.array(browserPlatformSchema).min(1),
  itemLimit: z.number().int().min(1).max(500),
  createdAt: z.string().datetime({ offset: true }),
  completedAt: z.string().datetime({ offset: true }).nullable(),
  platforms: z.record(browserPlatformSchema, platformCheckpointSchema),
  logs: z.array(collectionLogEntrySchema).default([]),
});
export type CollectionRun = z.infer<typeof collectionRunSchema>;

export const collectionSnapshotSchema = z.object({
  run: collectionRunSchema.nullable(),
  records: z.array(collectionRecordSchema),
});
export type CollectionSnapshot = z.infer<typeof collectionSnapshotSchema>;
