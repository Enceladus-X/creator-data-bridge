import path from "node:path";
import {
  type DashboardContent,
  type DashboardDailyPoint,
  type DashboardWarning,
  type YouTubeConnection,
  type YouTubeDashboardResponse,
  type YouTubeDashboardSnapshot,
  youtubeDashboardSnapshotSchema,
} from "@creator-data-bridge/contracts";
import { google } from "googleapis";
import { type AppConfig, isYouTubeConfigured } from "../config";
import { AppError } from "../errors";
import { SnapshotStore } from "../storage/snapshot-store";
import { type OAuthTokens, TokenVault } from "../storage/token-vault";
import { OAuthStateStore } from "./oauth-state";

const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
  "https://www.googleapis.com/auth/yt-analytics.readonly",
];

interface ReportData {
  columnHeaders?: Array<{ name?: string | null }> | null;
  rows?: Array<Array<string | number | null>> | null;
}

type ReportRow = Record<string, string | number | null>;

interface VideoMetadata {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  publishedAt: string | null;
}

export interface YouTubeServiceContract {
  getDashboard(): Promise<YouTubeDashboardResponse>;
  startConnection(): Promise<{ authorizationUrl: string }>;
  completeConnection(code: string, state: string): Promise<void>;
  disconnect(): Promise<void>;
  sync(days: number): Promise<YouTubeDashboardSnapshot>;
}

function numberValue(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowsFromReport(data: ReportData): ReportRow[] {
  const headers = data.columnHeaders?.map((header) => header.name ?? "") ?? [];
  return (data.rows ?? []).map((row) =>
    Object.fromEntries(headers.map((header, index) => [header, row[index] ?? null])),
  );
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function resolveDateRange(days: number, now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { startDate: dateOnly(start), endDate: dateOnly(end) };
}

function warning(code: string, message: string): DashboardWarning {
  return { code, message };
}

export class YouTubeService implements YouTubeServiceContract {
  private readonly tokenVault: TokenVault;
  private readonly snapshotStore: SnapshotStore;
  private readonly oauthStates = new OAuthStateStore();

  constructor(private readonly config: AppConfig) {
    this.tokenVault = new TokenVault(
      path.join(config.dataDir, "youtube-tokens.enc.json"),
      config.youtube.tokenEncryptionKey,
    );
    this.snapshotStore = new SnapshotStore(path.join(config.dataDir, "youtube-dashboard.json"));
  }

  async getDashboard(): Promise<YouTubeDashboardResponse> {
    return {
      connection: await this.getConnection(),
      snapshot: await this.snapshotStore.read(),
    };
  }

  async startConnection() {
    const oauth = this.createOAuthClient();
    const state = this.oauthStates.issue();
    return {
      authorizationUrl: oauth.generateAuthUrl({
        access_type: "offline",
        scope: YOUTUBE_SCOPES,
        include_granted_scopes: true,
        prompt: "consent",
        state,
      }),
    };
  }

  async completeConnection(code: string, state: string) {
    this.ensureConfigured();
    this.oauthStates.consume(state);
    const oauth = this.createOAuthClient();
    const { tokens } = await oauth.getToken(code);
    const current = await this.tokenVault.read();
    await this.tokenVault.write(
      {
        ...current?.tokens,
        ...(tokens as OAuthTokens),
        refresh_token: tokens.refresh_token ?? current?.tokens.refresh_token,
      },
      current?.connectedAt,
    );
  }

  async disconnect() {
    await Promise.all([this.tokenVault.delete(), this.snapshotStore.delete()]);
  }

  async sync(days: number): Promise<YouTubeDashboardSnapshot> {
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      throw new AppError(400, "INVALID_DATE_RANGE", "days must be between 1 and 365.");
    }

    const oauth = await this.createAuthorizedClient();
    const youtube = google.youtube({ version: "v3", auth: oauth });
    const analytics = google.youtubeAnalytics({ version: "v2", auth: oauth });
    const { startDate, endDate } = resolveDateRange(days);
    const warnings: DashboardWarning[] = [];

    try {
      const channelResponse = await youtube.channels.list({
        part: ["snippet", "statistics", "contentDetails"],
        mine: true,
      });
      const channel = channelResponse.data.items?.[0];
      if (!channel?.id) {
        throw new AppError(404, "YOUTUBE_CHANNEL_NOT_FOUND", "No YouTube channel was found.");
      }

      const uploadsPlaylistId = channel.contentDetails?.relatedPlaylists?.uploads;
      if (!uploadsPlaylistId) {
        throw new AppError(
          422,
          "YOUTUBE_UPLOADS_PLAYLIST_NOT_FOUND",
          "The channel uploads playlist is unavailable.",
        );
      }

      const recentUploads = await this.listUploadsSince(uploadsPlaylistId, startDate, youtube);
      const summaryQuery = analytics.reports.query({
        ids: "channel==MINE",
        startDate,
        endDate,
        metrics:
          "views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost,likes,comments,shares",
      });
      const dailyQuery = analytics.reports.query({
        ids: "channel==MINE",
        startDate,
        endDate,
        dimensions: "day",
        metrics: "views,estimatedMinutesWatched,subscribersGained,subscribersLost",
        sort: "day",
      });
      const topContentQuery = analytics.reports.query({
        ids: "channel==MINE",
        startDate,
        endDate,
        dimensions: "video",
        metrics:
          "views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares,subscribersGained",
        sort: "-views",
        maxResults: 10,
      });

      const [summaryResult, dailyResult, topContentResult] = await Promise.allSettled([
        summaryQuery,
        dailyQuery,
        topContentQuery,
      ]);

      const summaryRows =
        summaryResult.status === "fulfilled"
          ? rowsFromReport(summaryResult.value.data as ReportData)
          : [];
      const dailyRows =
        dailyResult.status === "fulfilled"
          ? rowsFromReport(dailyResult.value.data as ReportData)
          : [];
      const topRows =
        topContentResult.status === "fulfilled"
          ? rowsFromReport(topContentResult.value.data as ReportData)
          : [];

      if (summaryResult.status === "rejected") {
        warnings.push(
          warning("YOUTUBE_SUMMARY_UNAVAILABLE", "YouTube summary analytics are unavailable."),
        );
      }
      if (dailyResult.status === "rejected") {
        warnings.push(
          warning("YOUTUBE_DAILY_UNAVAILABLE", "YouTube daily analytics are unavailable."),
        );
      }
      if (topContentResult.status === "rejected") {
        warnings.push(
          warning("YOUTUBE_TOP_CONTENT_UNAVAILABLE", "YouTube top content is unavailable."),
        );
      }

      const summaryRow = summaryRows[0];
      const subscribersGained = summaryRow ? numberValue(summaryRow.subscribersGained) : null;
      const subscribersLost = summaryRow ? numberValue(summaryRow.subscribersLost) : null;
      const topVideoIds = topRows.map((row) => String(row.video ?? "")).filter(Boolean);
      const videoMetadata = await this.getVideoMetadata(topVideoIds, youtube);

      const daily: DashboardDailyPoint[] = dailyRows.map((row) => ({
        day: String(row.day ?? ""),
        views: numberValue(row.views),
        watchTimeMinutes: numberValue(row.estimatedMinutesWatched),
        subscriberNet: numberValue(row.subscribersGained) - numberValue(row.subscribersLost),
      }));
      const topContent: DashboardContent[] = topRows.map((row) => {
        const id = String(row.video ?? "");
        const metadata = videoMetadata.get(id);
        return {
          id,
          title: metadata?.title ?? id,
          url: `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`,
          thumbnailUrl: metadata?.thumbnailUrl ?? null,
          publishedAt: metadata?.publishedAt ?? null,
          views: numberValue(row.views),
          watchTimeMinutes: numberValue(row.estimatedMinutesWatched),
          averageViewDurationSeconds: numberValue(row.averageViewDuration),
          likes: numberValue(row.likes),
          comments: numberValue(row.comments),
          shares: numberValue(row.shares),
          subscribersGained: numberValue(row.subscribersGained),
        };
      });

      const snapshot = youtubeDashboardSnapshotSchema.parse({
        platform: "youtube",
        rangeDays: days,
        periodStart: startDate,
        periodEnd: endDate,
        lastSyncedAt: new Date().toISOString(),
        account: {
          id: channel.id,
          title: channel.snippet?.title ?? "YouTube channel",
          thumbnailUrl:
            channel.snippet?.thumbnails?.high?.url ??
            channel.snippet?.thumbnails?.medium?.url ??
            channel.snippet?.thumbnails?.default?.url ??
            null,
          subscriberCount: channel.statistics?.hiddenSubscriberCount
            ? null
            : numberValue(channel.statistics?.subscriberCount),
          totalViewCount: numberValue(channel.statistics?.viewCount),
          videoCount: numberValue(channel.statistics?.videoCount),
        },
        summary: {
          views: summaryRow ? numberValue(summaryRow.views) : null,
          watchTimeMinutes: summaryRow ? numberValue(summaryRow.estimatedMinutesWatched) : null,
          averageViewDurationSeconds: summaryRow
            ? numberValue(summaryRow.averageViewDuration)
            : null,
          subscribersGained,
          subscribersLost,
          subscriberNet:
            subscribersGained === null || subscribersLost === null
              ? null
              : subscribersGained - subscribersLost,
          likes: summaryRow ? numberValue(summaryRow.likes) : null,
          comments: summaryRow ? numberValue(summaryRow.comments) : null,
          shares: summaryRow ? numberValue(summaryRow.shares) : null,
          contentPublished: recentUploads.length,
        },
        daily,
        topContent,
        warnings,
      });

      await this.snapshotStore.write(snapshot);
      return snapshot;
    } finally {
      await this.tokenVault.merge(oauth.credentials as OAuthTokens);
    }
  }

  private async getConnection(): Promise<YouTubeConnection> {
    const configured = isYouTubeConfigured(this.config);
    if (!configured) {
      return {
        platform: "youtube",
        configured: false,
        connected: false,
        state: "not_configured",
        lastConnectedAt: null,
      };
    }

    const record = await this.tokenVault.read();
    return {
      platform: "youtube",
      configured: true,
      connected: Boolean(record),
      state: record ? "connected" : "disconnected",
      lastConnectedAt: record?.connectedAt ?? null,
    };
  }

  private ensureConfigured() {
    if (!isYouTubeConfigured(this.config)) {
      throw new AppError(
        503,
        "YOUTUBE_NOT_CONFIGURED",
        "Google OAuth credentials and TOKEN_ENCRYPTION_KEY are required.",
      );
    }
  }

  private createOAuthClient() {
    this.ensureConfigured();
    return new google.auth.OAuth2(
      this.config.youtube.clientId ?? undefined,
      this.config.youtube.clientSecret ?? undefined,
      this.config.youtube.redirectUri,
    );
  }

  private async createAuthorizedClient() {
    this.ensureConfigured();
    const record = await this.tokenVault.read();
    if (!record) {
      throw new AppError(401, "YOUTUBE_NOT_CONNECTED", "Connect a YouTube channel first.");
    }

    const oauth = this.createOAuthClient();
    oauth.setCredentials(record.tokens);
    return oauth;
  }

  private async listUploadsSince(
    playlistId: string,
    startDate: string,
    youtube: ReturnType<typeof google.youtube>,
  ) {
    const uploads: Array<{ id: string; publishedAt: string }> = [];
    let pageToken: string | undefined;
    let reachedOlderContent = false;

    do {
      const response = await youtube.playlistItems.list({
        part: ["contentDetails", "snippet"],
        playlistId,
        maxResults: 50,
        pageToken,
      });

      for (const item of response.data.items ?? []) {
        const id = item.contentDetails?.videoId;
        const publishedAt =
          item.contentDetails?.videoPublishedAt ?? item.snippet?.publishedAt ?? null;
        if (!id || !publishedAt) {
          continue;
        }
        if (publishedAt.slice(0, 10) < startDate) {
          reachedOlderContent = true;
          continue;
        }
        uploads.push({ id, publishedAt });
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken && !reachedOlderContent && uploads.length < 200);

    return uploads;
  }

  private async getVideoMetadata(videoIds: string[], youtube: ReturnType<typeof google.youtube>) {
    const result = new Map<string, VideoMetadata>();

    for (let index = 0; index < videoIds.length; index += 50) {
      const ids = videoIds.slice(index, index + 50);
      if (ids.length === 0) {
        continue;
      }
      const response = await youtube.videos.list({ part: ["snippet"], id: ids });
      for (const video of response.data.items ?? []) {
        if (!video.id) {
          continue;
        }
        result.set(video.id, {
          id: video.id,
          title: video.snippet?.title ?? video.id,
          thumbnailUrl:
            video.snippet?.thumbnails?.high?.url ??
            video.snippet?.thumbnails?.medium?.url ??
            video.snippet?.thumbnails?.default?.url ??
            null,
          publishedAt: video.snippet?.publishedAt ?? null,
        });
      }
    }

    return result;
  }
}
