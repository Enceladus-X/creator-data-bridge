import { describe, expect, it } from "vitest";
import {
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
