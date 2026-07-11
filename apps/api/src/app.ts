import { type PlatformCapability, platformCapabilitySchema } from "@creator-data-bridge/contracts";
import cors from "@fastify/cors";
import Fastify from "fastify";
import { z, ZodError } from "zod";
import { type AppConfig, loadConfig } from "./config";
import { AppError } from "./errors";
import { YouTubeService, type YouTubeServiceContract } from "./youtube/youtube-service";

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

const oauthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

const dateRangeSchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(28),
});

function completionPage() {
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>YouTube connected</title>
    <style>
      body { margin: 0; font: 16px system-ui, sans-serif; color: #191919; background: #f7f7f6; }
      main { max-width: 520px; margin: 12vh auto; padding: 32px; background: white; border: 1px solid #ddd; border-radius: 8px; }
      h1 { margin: 0 0 12px; font-size: 24px; }
      p { margin: 0; color: #666; line-height: 1.6; }
    </style>
  </head>
  <body><main><h1>YouTube 연결 완료</h1><p>Creator Data Bridge로 돌아가 동기화를 실행하세요. 이 탭은 닫아도 됩니다.</p></main></body>
</html>`;
}

export interface BuildAppOptions {
  config?: AppConfig;
  youtubeService?: YouTubeServiceContract;
  logger?: boolean;
}

export async function buildApp(options: BuildAppOptions = {}) {
  const config = options.config ?? loadConfig();
  const youtubeService = options.youtubeService ?? new YouTubeService(config);
  const app = Fastify({ logger: options.logger ?? process.env.NODE_ENV !== "test" });

  await app.register(cors, {
    origin(origin, callback) {
      const isExtension = origin?.startsWith("chrome-extension://") ?? false;
      const isAllowed = !origin || isExtension || config.corsOrigins.has(origin);
      callback(null, isAllowed);
    },
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: { code: "VALIDATION_ERROR", message: "The request is invalid." },
      });
    }
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: { code: error.code, message: error.message },
      });
    }

    app.log.error(error);
    return reply.status(500).send({
      error: { code: "INTERNAL_ERROR", message: "The request could not be completed." },
    });
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "creator-data-bridge-api",
    version: "0.2.0",
    timestamp: new Date().toISOString(),
  }));

  app.get("/v1/platforms", async () => ({ data: platformCatalog }));

  app.get("/v1/youtube", async () => youtubeService.getDashboard());

  app.post("/v1/youtube/connect", async () => youtubeService.startConnection());

  app.get("/v1/oauth/youtube/callback", async (request, reply) => {
    const query = oauthCallbackSchema.parse(request.query);
    await youtubeService.completeConnection(query.code, query.state);
    return reply.redirect("/v1/oauth/youtube/complete", 303);
  });

  app.get("/v1/oauth/youtube/complete", async (_request, reply) => {
    return reply
      .header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'")
      .type("text/html; charset=utf-8")
      .send(completionPage());
  });

  app.delete("/v1/youtube/connect", async () => {
    await youtubeService.disconnect();
    return youtubeService.getDashboard();
  });

  app.post("/v1/youtube/sync", async (request) => {
    const { days } = dateRangeSchema.parse(request.query);
    await youtubeService.sync(days);
    return youtubeService.getDashboard();
  });

  return app;
}
