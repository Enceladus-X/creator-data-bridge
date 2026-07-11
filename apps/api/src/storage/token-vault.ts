import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "../errors";

export interface OAuthTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string;
  token_type?: string | null;
  expiry_date?: number | null;
}

interface TokenRecord {
  tokens: OAuthTokens;
  connectedAt: string;
}

interface EncryptedPayload {
  version: 1;
  iv: string;
  tag: string;
  ciphertext: string;
}

function parseKey(key: string | null) {
  if (!key || !/^[a-fA-F0-9]{64}$/.test(key)) {
    throw new AppError(
      503,
      "TOKEN_VAULT_NOT_CONFIGURED",
      "TOKEN_ENCRYPTION_KEY must be a 64-character hexadecimal value.",
    );
  }

  return Buffer.from(key, "hex");
}

export class TokenVault {
  constructor(
    private readonly filePath: string,
    private readonly encryptionKey: string | null,
  ) {}

  async exists() {
    try {
      await readFile(this.filePath);
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return false;
      }
      throw error;
    }
  }

  async read(): Promise<TokenRecord | null> {
    let serialized: string;
    try {
      serialized = await readFile(this.filePath, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }

    const payload = JSON.parse(serialized) as EncryptedPayload;
    const key = parseKey(this.encryptionKey);
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
    decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, "base64")),
      decipher.final(),
    ]).toString("utf8");

    return JSON.parse(plaintext) as TokenRecord;
  }

  async write(tokens: OAuthTokens, connectedAt = new Date().toISOString()) {
    const key = parseKey(this.encryptionKey);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const plaintext = Buffer.from(JSON.stringify({ tokens, connectedAt } satisfies TokenRecord));
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const payload: EncryptedPayload = {
      version: 1,
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    };

    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(payload)}\n`, { encoding: "utf8", mode: 0o600 });
  }

  async merge(tokens: OAuthTokens) {
    const current = await this.read();
    if (!current) {
      await this.write(tokens);
      return;
    }

    await this.write(
      {
        ...current.tokens,
        ...tokens,
        refresh_token: tokens.refresh_token ?? current.tokens.refresh_token,
      },
      current.connectedAt,
    );
  }

  async delete() {
    await rm(this.filePath, { force: true });
  }
}
