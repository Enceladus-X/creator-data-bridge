import { describe, expect, it } from "vitest";
import {
  collectionRecordSchema,
  collectionRunSchema,
  metricObservationSchema,
  platformCapabilitySchema,
  youtubeDashboardResponseSchema,
} from "../src/index";

describe("metricObservationSchema", () => {
  const baseObservation = {
    metricId: "views",
    value: 993,
    unit: "count",
    scope: "account_period",
    platform: "youtube",
    source: "youtube_analytics_api",
    method: "provider_reported",
    collectedAt: "2026-07-11T03:00:00Z",
    coverage: "complete",
  } as const;

  it("accepts a provider-reported metric", () => {
    expect(metricObservationSchema.parse(baseObservation)).toEqual(baseObservation);
  });

  it("keeps unsupported distinct from zero", () => {
    const unsupported = {
      ...baseObservation,
      value: null,
      platform: "tiktok",
      coverage: "unsupported",
    } as const;

    expect(metricObservationSchema.parse(unsupported).value).toBeNull();
    expect(() => metricObservationSchema.parse({ ...unsupported, value: 0 })).toThrow();
  });

  it("rejects a completed metric without a value", () => {
    expect(() => metricObservationSchema.parse({ ...baseObservation, value: null })).toThrow();
  });
});

describe("platformCapabilitySchema", () => {
  it("validates connector metadata", () => {
    const capability = platformCapabilitySchema.parse({
      platform: "youtube",
      state: "available",
      label: "YouTube",
      description: "Channel metadata and analytics reports",
      supportedScopes: ["youtube.readonly", "yt-analytics.readonly"],
    });

    expect(capability.platform).toBe("youtube");
  });
});

describe("youtubeDashboardResponseSchema", () => {
  it("accepts a disconnected account without a snapshot", () => {
    const response = youtubeDashboardResponseSchema.parse({
      connection: {
        platform: "youtube",
        configured: true,
        connected: false,
        state: "disconnected",
        lastConnectedAt: null,
      },
      snapshot: null,
    });

    expect(response.snapshot).toBeNull();
  });
});

describe("browser collection contracts", () => {
  it("keeps an unavailable metric distinct from zero", () => {
    const record = collectionRecordSchema.parse({
      schemaVersion: "1.0.0",
      runId: "run-1",
      snapshotAt: "2026-07-12T02:07:08.055Z",
      platform: "instagram",
      accountName: "Loorbit",
      accountHandle: "@loorbit0",
      recordType: "content",
      contentId: "DaqFYYNyJBs",
      contentUrl: "https://www.instagram.com/loorbit0/reel/DaqFYYNyJBs/",
      contentType: "reel",
      title: "one face looked like cardboard",
      publishedAt: "2026-07-11",
      durationSeconds: 22,
      views: null,
      viewsCoverage: "unavailable",
      likes: 6,
      likesCoverage: "complete",
      comments: 0,
      commentsCoverage: "complete",
      shares: null,
      sharesCoverage: "unavailable",
      saves: null,
      savesCoverage: "unavailable",
      followers: null,
      following: null,
      totalPosts: null,
      sourceSurface: "instagram_reel_web",
      selectorVersion: "instagram-meta-v1",
      notes: "",
    });

    expect(record.views).toBeNull();
    expect(record.comments).toBe(0);
  });

  it("validates a partially completed collection run", () => {
    const checkpoint = (platform: "youtube" | "tiktok" | "instagram" | "x") => ({
      platform,
      state: platform === "instagram" ? "failed" : "completed",
      accountHandle: platform === "x" ? "@Loorbit0" : "@loorbit0",
      discovered: platform === "instagram" ? 2 : 4,
      rowsWritten: platform === "instagram" ? 3 : 5,
      warningCodes: platform === "instagram" ? ["SURFACE_NOT_READY"] : [],
      errorCode: platform === "instagram" ? "SURFACE_NOT_READY" : null,
      errorMessage: platform === "instagram" ? "Reel을 읽지 못했습니다." : null,
      lastHeartbeatAt: "2026-07-12T02:07:08.055Z",
    });

    const run = collectionRunSchema.parse({
      id: "run-1",
      state: "partially_completed",
      requestedPlatforms: ["tiktok", "instagram", "x"],
      itemLimit: 100,
      createdAt: "2026-07-12T02:00:00.000Z",
      completedAt: "2026-07-12T02:07:08.055Z",
      platforms: {
        youtube: checkpoint("youtube"),
        tiktok: checkpoint("tiktok"),
        instagram: checkpoint("instagram"),
        x: checkpoint("x"),
      },
    });

    expect(run.state).toBe("partially_completed");
  });
});
