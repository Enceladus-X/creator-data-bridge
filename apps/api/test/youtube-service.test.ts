import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppConfig } from "../src/config";
import { TokenVault } from "../src/storage/token-vault";

const googleMocks = vi.hoisted(() => ({
  channelsList: vi.fn(),
  playlistItemsList: vi.fn(),
  videosList: vi.fn(),
  reportsQuery: vi.fn(),
}));

vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: class {
        credentials: Record<string, unknown> = {};
        setCredentials(tokens: Record<string, unknown>) {
          this.credentials = tokens;
        }
        generateAuthUrl() {
          return "https://accounts.google.com/test";
        }
        async getToken() {
          return { tokens: {} };
        }
      },
    },
    youtube: () => ({
      channels: { list: googleMocks.channelsList },
      playlistItems: { list: googleMocks.playlistItemsList },
      videos: { list: googleMocks.videosList },
    }),
    youtubeAnalytics: () => ({ reports: { query: googleMocks.reportsQuery } }),
  },
}));

import { resolveDateRange, YouTubeService } from "../src/youtube/youtube-service";

const directories: string[] = [];

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("resolveDateRange", () => {
  it("uses the previous complete UTC day and includes the requested number of days", () => {
    expect(resolveDateRange(28, new Date("2026-07-11T12:00:00Z"))).toEqual({
      startDate: "2026-06-13",
      endDate: "2026-07-10",
    });
  });
});

describe("YouTubeService", () => {
  it("maps Google channel and analytics responses into the dashboard contract", async () => {
    const dataDir = await mkdtemp(path.join(tmpdir(), "creator-data-bridge-youtube-"));
    directories.push(dataDir);
    const encryptionKey = "a".repeat(64);
    const config: AppConfig = {
      host: "127.0.0.1",
      port: 8787,
      corsOrigins: new Set(["http://localhost:5173"]),
      dataDir,
      youtube: {
        clientId: "client-id",
        clientSecret: "client-secret",
        redirectUri: "http://127.0.0.1:8787/v1/oauth/youtube/callback",
        tokenEncryptionKey: encryptionKey,
      },
    };
    await new TokenVault(path.join(dataDir, "youtube-tokens.enc.json"), encryptionKey).write({
      access_token: "encrypted-at-rest",
      refresh_token: "refresh-token",
    });

    googleMocks.channelsList.mockResolvedValue({
      data: {
        items: [
          {
            id: "UC_test",
            snippet: {
              title: "Test Channel",
              thumbnails: { high: { url: "https://img.test/c.jpg" } },
            },
            statistics: { subscriberCount: "12", viewCount: "993", videoCount: "3" },
            contentDetails: { relatedPlaylists: { uploads: "UU_test" } },
          },
        ],
      },
    });
    googleMocks.playlistItemsList.mockResolvedValue({
      data: {
        items: [
          {
            contentDetails: { videoId: "video-1", videoPublishedAt: "2026-07-01T00:00:00Z" },
          },
        ],
      },
    });
    googleMocks.videosList.mockResolvedValue({
      data: {
        items: [
          {
            id: "video-1",
            snippet: {
              title: "First video",
              publishedAt: "2026-07-01T00:00:00Z",
              thumbnails: { high: { url: "https://img.test/v.jpg" } },
            },
          },
        ],
      },
    });
    googleMocks.reportsQuery.mockImplementation((params: { dimensions?: string }) => {
      if (params.dimensions === "day") {
        return Promise.resolve({
          data: {
            columnHeaders: [
              { name: "day" },
              { name: "views" },
              { name: "estimatedMinutesWatched" },
              { name: "subscribersGained" },
              { name: "subscribersLost" },
            ],
            rows: [["2026-07-01", 100, 90, 2, 1]],
          },
        });
      }
      if (params.dimensions === "video") {
        return Promise.resolve({
          data: {
            columnHeaders: [
              { name: "video" },
              { name: "views" },
              { name: "estimatedMinutesWatched" },
              { name: "averageViewDuration" },
              { name: "likes" },
              { name: "comments" },
              { name: "shares" },
              { name: "subscribersGained" },
            ],
            rows: [["video-1", 100, 90, 54, 8, 2, 1, 2]],
          },
        });
      }
      return Promise.resolve({
        data: {
          columnHeaders: [
            { name: "views" },
            { name: "estimatedMinutesWatched" },
            { name: "averageViewDuration" },
            { name: "subscribersGained" },
            { name: "subscribersLost" },
            { name: "likes" },
            { name: "comments" },
            { name: "shares" },
          ],
          rows: [[100, 90, 54, 2, 1, 8, 2, 1]],
        },
      });
    });

    const snapshot = await new YouTubeService(config).sync(28);

    expect(snapshot.account).toMatchObject({ title: "Test Channel", subscriberCount: 12 });
    expect(snapshot.summary).toMatchObject({ views: 100, subscriberNet: 1, contentPublished: 1 });
    expect(snapshot.daily).toEqual([
      { day: "2026-07-01", views: 100, watchTimeMinutes: 90, subscriberNet: 1 },
    ]);
    expect(snapshot.topContent[0]).toMatchObject({
      id: "video-1",
      title: "First video",
      averageViewDurationSeconds: 54,
    });
  });
});
