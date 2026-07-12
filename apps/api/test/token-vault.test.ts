import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TokenVault } from "../src/storage/token-vault";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("TokenVault", () => {
  it("encrypts OAuth tokens at rest and decrypts them with the configured key", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "creator-data-bridge-"));
    directories.push(directory);
    const filePath = path.join(directory, "youtube-tokens.enc.json");
    const vault = new TokenVault(filePath, randomBytes(32).toString("hex"));

    await vault.write({ access_token: "access-secret", refresh_token: "refresh-secret" });

    const serialized = await readFile(filePath, "utf8");
    const restored = await vault.read();
    expect(serialized).not.toContain("access-secret");
    expect(serialized).not.toContain("refresh-secret");
    expect(restored?.tokens.refresh_token).toBe("refresh-secret");
  });

  it("preserves the refresh token when Google only refreshes the access token", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "creator-data-bridge-"));
    directories.push(directory);
    const vault = new TokenVault(
      path.join(directory, "youtube-tokens.enc.json"),
      randomBytes(32).toString("hex"),
    );
    await vault.write({ access_token: "first", refresh_token: "keep-me" });

    await vault.merge({ access_token: "second", expiry_date: 1234 });

    expect((await vault.read())?.tokens).toMatchObject({
      access_token: "second",
      refresh_token: "keep-me",
      expiry_date: 1234,
    });
  });
});
