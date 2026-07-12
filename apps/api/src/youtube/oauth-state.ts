import { randomBytes } from "node:crypto";
import { AppError } from "../errors";

export class OAuthStateStore {
  private readonly states = new Map<string, number>();

  issue(now = Date.now()) {
    this.prune(now);
    const state = randomBytes(24).toString("base64url");
    this.states.set(state, now + 10 * 60 * 1000);
    return state;
  }

  consume(state: string, now = Date.now()) {
    const expiresAt = this.states.get(state);
    this.states.delete(state);
    if (!expiresAt || expiresAt < now) {
      throw new AppError(400, "INVALID_OAUTH_STATE", "OAuth state is invalid or expired.");
    }
  }

  private prune(now: number) {
    for (const [state, expiresAt] of this.states) {
      if (expiresAt < now) {
        this.states.delete(state);
      }
    }
  }
}
