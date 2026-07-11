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
