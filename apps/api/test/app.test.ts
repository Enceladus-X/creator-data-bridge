import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { YouTubeServiceContract } from "../src/youtube/youtube-service";

const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe("API", () => {
  it("reports health", async () => {
    const app = await buildApp();
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      service: "creator-data-bridge-api",
      version: "0.2.0",
    });
  });

  it("lists connector readiness", async () => {
    const app = await buildApp();
    apps.push(app);

    const response = await app.inject({ method: "GET", url: "/v1/platforms" });
    const payload = response.json();

    expect(response.statusCode).toBe(200);
    expect(payload.data).toHaveLength(4);
    expect(payload.data[0]).toMatchObject({ platform: "youtube", state: "available" });
  });

  it("does not grant CORS to an arbitrary website", async () => {
    const app = await buildApp();
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { origin: "https://example.com" },
    });

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("reports missing YouTube OAuth configuration without a generic 500", async () => {
    const app = await buildApp({ logger: false });
    apps.push(app);

    const response = await app.inject({ method: "POST", url: "/v1/youtube/connect" });

    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe("YOUTUBE_NOT_CONFIGURED");
  });

  it("exposes YouTube connection state through the service boundary", async () => {
    const youtubeService: YouTubeServiceContract = {
      getDashboard: async () => ({
        connection: {
          platform: "youtube",
          configured: true,
          connected: false,
          state: "disconnected",
          lastConnectedAt: null,
        },
        snapshot: null,
      }),
      startConnection: async () => ({ authorizationUrl: "https://accounts.google.com/test" }),
      completeConnection: async () => undefined,
      disconnect: async () => undefined,
      sync: async () => {
        throw new Error("not needed in this test");
      },
    };
    const app = await buildApp({ youtubeService, logger: false });
    apps.push(app);

    const statusResponse = await app.inject({ method: "GET", url: "/v1/youtube" });
    const connectResponse = await app.inject({ method: "POST", url: "/v1/youtube/connect" });

    expect(statusResponse.json().connection.state).toBe("disconnected");
    expect(connectResponse.json().authorizationUrl).toContain("accounts.google.com");
  });

  it("rejects an invalid sync range before calling the connector", async () => {
    let syncCalled = false;
    const youtubeService: YouTubeServiceContract = {
      getDashboard: async () => ({
        connection: {
          platform: "youtube",
          configured: true,
          connected: true,
          state: "connected",
          lastConnectedAt: "2026-07-11T00:00:00Z",
        },
        snapshot: null,
      }),
      startConnection: async () => ({ authorizationUrl: "https://accounts.google.com/test" }),
      completeConnection: async () => undefined,
      disconnect: async () => undefined,
      sync: async () => {
        syncCalled = true;
        throw new Error("unexpected");
      },
    };
    const app = await buildApp({ youtubeService, logger: false });
    apps.push(app);

    const response = await app.inject({ method: "POST", url: "/v1/youtube/sync?days=0" });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("VALIDATION_ERROR");
    expect(syncCalled).toBe(false);
  });

  it("removes the authorization code from the visible callback URL", async () => {
    let completed = false;
    const youtubeService: YouTubeServiceContract = {
      getDashboard: async () => ({
        connection: {
          platform: "youtube",
          configured: true,
          connected: true,
          state: "connected",
          lastConnectedAt: "2026-07-11T00:00:00Z",
        },
        snapshot: null,
      }),
      startConnection: async () => ({ authorizationUrl: "https://accounts.google.com/test" }),
      completeConnection: async () => {
        completed = true;
      },
      disconnect: async () => undefined,
      sync: async () => {
        throw new Error("not needed in this test");
      },
    };
    const app = await buildApp({ youtubeService, logger: false });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/v1/oauth/youtube/callback?code=secret-code&state=valid-state",
    });

    expect(response.statusCode).toBe(303);
    expect(response.headers.location).toBe("/v1/oauth/youtube/complete");
    expect(response.body).not.toContain("secret-code");
    expect(completed).toBe(true);
  });
});
