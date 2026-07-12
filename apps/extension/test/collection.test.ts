import type { CollectionRecord } from "@creator-data-bridge/contracts";
import { describe, expect, it } from "vitest";
import { buildCollectionCsv, collectionCsvHeaders } from "../src/collection/csv";
import {
  normalizeHandle,
  parseCompactCount,
  parseDuration,
  parseInstagramDate,
} from "../src/collection/normalize";
import { normalizeCollectionPreferences } from "../src/collection/preferences";

describe("collection normalization", () => {
  it.each([
    ["2.2천", 2200],
    ["14.5만", 145000],
    ["1.2K", 1200],
    ["1,337", 1337],
    ["0", 0],
  ])("parses compact count %s", (input, expected) => {
    expect(parseCompactCount(input)).toBe(expected);
  });

  it("parses durations and handles", () => {
    expect(parseDuration("00:47")).toBe(47);
    expect(parseDuration("1:02:03")).toBe(3723);
    expect(normalizeHandle("@@Loorbit0")).toBe("@Loorbit0");
  });

  it("parses Instagram's English metadata date", () => {
    expect(parseInstagramDate("July 11, 2026")).toBe("2026-07-11");
  });
});

describe("collection preferences", () => {
  it("keeps the supported platform order and a valid item limit", () => {
    expect(
      normalizeCollectionPreferences({
        enabledPlatforms: ["instagram", "unsupported", "tiktok"],
        itemLimit: 250,
      }),
    ).toEqual({ enabledPlatforms: ["tiktok", "instagram"], itemLimit: 250 });
  });

  it("allows all platforms to be disabled and repairs an invalid limit", () => {
    expect(normalizeCollectionPreferences({ enabledPlatforms: [], itemLimit: 999 })).toEqual({
      enabledPlatforms: [],
      itemLimit: 100,
    });
  });
});

describe("collection CSV", () => {
  it("writes stable UTF-8 BOM CSV and preserves missing versus zero", () => {
    const record: CollectionRecord = {
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
      title: 'cloth, "finally" real',
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
      notes: "line 1\nline 2",
    };

    const csv = buildCollectionCsv([record]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.split("\r\n")[0]?.split(",")).toHaveLength(collectionCsvHeaders.length);
    expect(csv).toContain('"comments","comments_coverage"');
    expect(csv).toContain('"","unavailable","6","complete","0","complete"');
    expect(csv).toContain('"cloth, ""finally"" real"');
  });
});
