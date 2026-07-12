import type { CollectionRecord } from "@creator-data-bridge/contracts";
import { collectionRecordSchema } from "@creator-data-bridge/contracts";
import {
  metricCoverage,
  normalizeHandle,
  parseCompactCount,
  parseDuration,
  parseInstagramDate,
  parseKoreanStudioDate,
  sanitizeContentUrl,
} from "./normalize";
import type { RawPlatformPayload } from "./types";

function commonRecord(
  runId: string,
  snapshotAt: string,
  payload: RawPlatformPayload,
  selectorVersion: string,
) {
  const profile = payload.profile;
  if (!profile) throw new Error(`${payload.platform} profile is missing`);
  return {
    schemaVersion: "1.0.0" as const,
    runId,
    snapshotAt,
    platform: payload.platform,
    accountName: profile.accountName,
    accountHandle: normalizeHandle(profile.accountHandle),
    sourceSurface: `${payload.platform}_profile_web`,
    selectorVersion,
  };
}

export function normalizePlatformPayload(
  runId: string,
  payload: RawPlatformPayload,
  selectorVersion: string,
  snapshotAt = new Date().toISOString(),
): CollectionRecord[] {
  const profile = payload.profile;
  if (!profile) return [];
  const common = commonRecord(runId, snapshotAt, payload, selectorVersion);
  const profileLikes = parseCompactCount(profile.totalLikesText);
  const records: CollectionRecord[] = [
    collectionRecordSchema.parse({
      ...common,
      recordType: "channel_summary",
      contentId: "",
      contentUrl:
        payload.platform === "instagram"
          ? `https://www.instagram.com/${profile.accountHandle.replace(/^@/, "")}/`
          : payload.platform === "tiktok"
            ? `https://www.tiktok.com/@${profile.accountHandle.replace(/^@/, "")}`
            : `https://x.com/${profile.accountHandle.replace(/^@/, "")}`,
      contentType: "profile",
      title: profile.accountName,
      publishedAt: null,
      durationSeconds: null,
      views: null,
      viewsCoverage: "unavailable",
      likes: profileLikes,
      likesCoverage: metricCoverage(profileLikes, "unavailable"),
      comments: null,
      commentsCoverage: "unavailable",
      shares: null,
      sharesCoverage: "unavailable",
      saves: null,
      savesCoverage: "unavailable",
      followers: parseCompactCount(profile.followersText),
      following: parseCompactCount(profile.followingText),
      totalPosts: parseCompactCount(profile.totalPostsText) ?? payload.items.length,
      notes: profile.notes.join("; "),
    }),
  ];

  for (const item of payload.items) {
    const views = parseCompactCount(item.viewsText);
    const likes = parseCompactCount(item.likesText);
    const comments = parseCompactCount(item.commentsText);
    const shares = parseCompactCount(item.sharesText);
    const saves = parseCompactCount(item.savesText);
    const publishedAt =
      item.publishedAt ??
      (payload.platform === "instagram"
        ? parseInstagramDate(item.publishedDisplay)
        : payload.platform === "tiktok"
          ? parseKoreanStudioDate(item.publishedDisplay, new Date(snapshotAt))
          : null);
    const unavailable = payload.platform === "instagram" ? "unavailable" : "partial";

    records.push(
      collectionRecordSchema.parse({
        ...common,
        sourceSurface:
          payload.platform === "tiktok"
            ? "tiktok_studio_content"
            : payload.platform === "instagram"
              ? "instagram_reel_web"
              : "x_profile_web",
        recordType: "content",
        contentId: item.contentId,
        contentUrl: sanitizeContentUrl(item.contentUrl),
        contentType: item.contentType,
        title: item.title,
        publishedAt,
        durationSeconds: item.durationSeconds ?? parseDuration(item.durationDisplay),
        views,
        viewsCoverage: metricCoverage(views, unavailable),
        likes,
        likesCoverage: metricCoverage(likes, unavailable),
        comments,
        commentsCoverage: metricCoverage(comments, unavailable),
        shares,
        sharesCoverage: metricCoverage(shares, "unavailable"),
        saves,
        savesCoverage: metricCoverage(saves, "unavailable"),
        followers: null,
        following: null,
        totalPosts: null,
        notes: [
          item.publishedDisplay && !publishedAt ? `published_display=${item.publishedDisplay}` : "",
          ...item.notes,
        ]
          .filter(Boolean)
          .join("; "),
      }),
    );
  }
  return records;
}
