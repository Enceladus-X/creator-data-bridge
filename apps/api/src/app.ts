import { type PlatformCapability, platformCapabilitySchema } from "@creator-data-bridge/contracts";
import cors from "@fastify/cors";
import Fastify from "fastify";

const platformCatalog: PlatformCapability[] = [
  {
    platform: "youtube",
    state: "available",
    label: "YouTube",
    description: "Channel metadata and Analytics reports",
    supportedScopes: ["youtube.readonly", "yt-analytics.readonly"],
  },
  {
    platform: "instagram",
    state: "planned",
    label: "Instagram",
    description: "Professional account and media insights",
    supportedScopes: ["instagram_business_basic", "instagram_business_manage_insights"],
  },
  {
    platform: "tiktok",
    state: "planned",
    label: "TikTok",
    description: "Profile statistics and public video performance",
    supportedScopes: ["user.info.stats", "video.list"],
  },
  {
    platform: "x",
    state: "planned",
    label: "X",
    description: "Owned posts and engagement metrics",
    supportedScopes: ["tweet.read", "users.read", "offline.access"],
  },
].map((platform) => platformCapabilitySchema.parse(platform));

function parseAllowedOrigins() {
  return new Set(
    (process.env.CORS_ORIGINS ?? "http://localhost:5173")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export async function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== "test" });
  const allowedOrigins = parseAllowedOrigins();

  await app.register(cors, {
    origin(origin, callback) {
      const isExtension = origin?.startsWith("chrome-extension://") ?? false;
      const isAllowed = !origin || isExtension || allowedOrigins.has(origin);
      callback(null, isAllowed);
    },
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "creator-data-bridge-api",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  }));

  app.get("/v1/platforms", async () => ({ data: platformCatalog }));

  return app;
}
