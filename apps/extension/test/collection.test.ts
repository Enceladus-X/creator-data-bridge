import type { CollectionRecord } from "@creator-data-bridge/contracts";
import { describe, expect, it } from "vitest";
import { buildCollectionCsv, collectionCsvHeaders } from "../src/collection/csv";
import {
  normalizeHandle,
  parseCompactCount,
  parseDuration,
  parseInstagramDate,
  parseYouTubeStudioDate,
} from "../src/collection/normalize";
import { normalizeCollectionPreferences } from "../src/collection/preferences";
import { normalizePlatformPayload } from "../src/collection/records";
import { buildPlatformSummaries, formatMetric } from "../src/dashboard/CollectionDashboard";

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

  it("parses YouTube Studio's localized date", () => {
    expect(parseYouTubeStudioDate("2026. 7. 11. 게시됨")).toBe("2026-07-11");
  });
});

describe("collection preferences", () => {
  it("keeps the supported platform order and drops the legacy item limit", () => {
    expect(
      normalizeCollectionPreferences({
        enabledPlatforms: ["instagram", "unsupported", "tiktok"],
        itemLimit: 250,
      }),
    ).toEqual({
      schemaVersion: 3,
      enabledPlatforms: ["youtube", "tiktok", "instagram"],
    });
  });

  it("enables the newly added YouTube collector for legacy preferences", () => {
    expect(normalizeCollectionPreferences({ enabledPlatforms: [], itemLimit: 999 })).toEqual({
      schemaVersion: 3,
      enabledPlatforms: ["youtube"],
    });
  });

  it("keeps YouTube disabled after the v2 preference is saved", () => {
    expect(
      normalizeCollectionPreferences({
        schemaVersion: 2,
        enabledPlatforms: ["tiktok", "instagram"],
        itemLimit: 100,
      }),
    ).toEqual({
      schemaVersion: 3,
      enabledPlatforms: ["tiktok", "instagram"],
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

describe("YouTube Studio normalization", () => {
  it("preserves Studio views, likes, and explicit zero comments", () => {
    const records = normalizePlatformPayload(
      "run-youtube",
      {
        ok: true,
        platform: "youtube",
        profile: {
          accountName: "Loorbit",
          accountHandle: "UC3et4G7xRpVJuZNEW4mHwhw",
          followersText: "5",
          followingText: null,
          totalPostsText: "1",
          totalLikesText: null,
          channelViewsText: "1.5천",
          watchHoursText: "4.1",
          notes: ["analytics_period=last_28_days"],
        },
        items: [
          {
            contentId: "DrFGgiJC-TU",
            contentUrl: "https://www.youtube.com/shorts/DrFGgiJC-TU",
            contentType: "short",
            title: "1kg vs 1000kg",
            publishedDisplay: "2026. 7. 11.",
            publishedAt: null,
            durationDisplay: "0:22",
            durationSeconds: null,
            viewsText: "1.2천",
            likesText: "7",
            commentsText: "0",
            sharesText: null,
            savesText: null,
            notes: ["visibility=공개"],
          },
        ],
        warningCodes: [],
        errorCode: null,
        errorMessage: null,
      },
      "youtube-studio-v2",
      "2026-07-12T02:07:08.055Z",
    );

    expect(records[0]).toMatchObject({
      recordType: "channel_summary",
      accountHandle: "UC3et4G7xRpVJuZNEW4mHwhw",
      followers: 5,
      views: 1500,
      viewsCoverage: "complete",
    });
    expect(records[0]?.notes).toContain("watch_hours_28d=4.1");
    expect(records[1]).toMatchObject({
      publishedAt: "2026-07-11",
      views: 1200,
      viewsCoverage: "complete",
      likes: 7,
      likesCoverage: "complete",
      comments: 0,
      commentsCoverage: "complete",
    });
  });
});

describe("collection dashboard aggregation", () => {
  it("renders full metric numbers instead of compact Korean units", () => {
    expect(formatMetric(2200)).toBe("2,200");
    expect(formatMetric(145000)).toBe("145,000");
  });

  it("aggregates known metrics without turning unavailable values into displayed data", () => {
    const records: CollectionRecord[] = [
      {
        schemaVersion: "1.0.0",
        runId: "run-dashboard",
        snapshotAt: "2026-07-12T02:07:08.055Z",
        platform: "instagram",
        accountName: "Loorbit",
        accountHandle: "@loorbit0",
        recordType: "content",
        contentId: "reel-1",
        contentUrl: "https://www.instagram.com/reel/reel-1/",
        contentType: "reel",
        title: "test reel",
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
      },
    ];

    const instagram = buildPlatformSummaries(records, null).find(
      (summary) => summary.platform === "instagram",
    );
    expect(instagram).toMatchObject({
      contentCount: 1,
      knownViews: 0,
      views: 0,
      likes: 6,
      comments: 0,
      unavailable: 1,
    });
  });
});
