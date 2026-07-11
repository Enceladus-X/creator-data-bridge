import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";

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
      version: "0.1.0",
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
});
