import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { config } from "../config/env";

const PREFIX = "enc:v1:";

function encryptionKey(): Buffer {
  if (!config.TOKEN_ENCRYPTION_KEY || config.TOKEN_ENCRYPTION_KEY.length < 32) {
    throw Object.assign(new Error("Set TOKEN_ENCRYPTION_KEY to a random secret of at least 32 characters before connecting Google Analytics."), { status: 503 });
  }
  return createHash("sha256").update(config.TOKEN_ENCRYPTION_KEY, "utf8").digest();
}

export function encryptRefreshToken(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptRefreshToken(value: string): string {
  if (!value.startsWith(PREFIX)) {
    throw Object.assign(new Error("Stored Google refresh token is not encrypted. Reconnect Google Analytics after setting TOKEN_ENCRYPTION_KEY."), { status: 503 });
  }
  const [ivText, tagText, encryptedText] = value.slice(PREFIX.length).split(":");
  if (!ivText || !tagText || !encryptedText) {
    throw Object.assign(new Error("Stored Google refresh token has an invalid encrypted format."), { status: 503 });
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedText, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw Object.assign(new Error("Could not decrypt the Google refresh token. Verify TOKEN_ENCRYPTION_KEY has not changed."), { status: 503 });
  }
}
