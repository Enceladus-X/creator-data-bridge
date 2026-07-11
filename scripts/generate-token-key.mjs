import { randomBytes } from "node:crypto";

console.log(`TOKEN_ENCRYPTION_KEY=${randomBytes(32).toString("hex")}`);
