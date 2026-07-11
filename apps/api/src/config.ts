import { fileURLToPath } from "node:url";
import path from "node:path";

const workspaceRoot = fileURLToPath(new URL("../../..", import.meta.url));

export interface AppConfig {
  host: string;
  port: number;
  corsOrigins: Set<string>;
  dataDir: string;
  youtube: {
    clientId: string | null;
    clientSecret: string | null;
    redirectUri: string;
    tokenEncryptionKey: string | null;
  };
}

function optional(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const configuredDataDir = env.DATA_DIR?.trim() || ".data";

  return {
    host: env.HOST?.trim() || "127.0.0.1",
    port: Number.parseInt(env.PORT ?? "8787", 10),
    corsOrigins: new Set(
      (env.CORS_ORIGINS ?? "http://localhost:5173")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
    dataDir: path.isAbsolute(configuredDataDir)
      ? configuredDataDir
      : path.resolve(workspaceRoot, configuredDataDir),
    youtube: {
      clientId: optional(env.GOOGLE_CLIENT_ID),
      clientSecret: optional(env.GOOGLE_CLIENT_SECRET),
      redirectUri:
        env.GOOGLE_REDIRECT_URI?.trim() ||
        "http://127.0.0.1:8787/v1/oauth/youtube/callback",
      tokenEncryptionKey: optional(env.TOKEN_ENCRYPTION_KEY),
    },
  };
}

export function isYouTubeConfigured(config: AppConfig) {
  return Boolean(
    config.youtube.clientId &&
      config.youtube.clientSecret &&
      config.youtube.redirectUri &&
      config.youtube.tokenEncryptionKey,
  );
}
