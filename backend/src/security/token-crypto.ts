import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { config } from "../config/env";

const PREFIX = "enc:v1:";

function encryptionKey(): Buffer {
  const key = Buffer.from(config.TOKEN_ENCRYPTION_KEY ?? "", "hex");
  if (!config.TOKEN_ENCRYPTION_KEY || key.length !== 32) {
    throw Object.assign(new Error("TOKEN_ENCRYPTION_KEY must be a 32-byte hexadecimal secret. Generate one with openssl rand -hex 32."), { status: 503 });
  }
  return key;
}

export function encryptGoogleToken(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

export function decryptGoogleToken(value: string): string {
  if (!value.startsWith(PREFIX)) {
    throw Object.assign(new Error("Stored Google token is not encrypted. Reconnect Google Analytics after setting TOKEN_ENCRYPTION_KEY."), { status: 503 });
  }
  const [ivText, tagText, encryptedText] = value.slice(PREFIX.length).split(":");
  if (!ivText || !tagText || !encryptedText) {
    throw Object.assign(new Error("Stored Google token has an invalid encrypted format."), { status: 503 });
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedText, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw Object.assign(new Error("Could not decrypt the Google token. Verify TOKEN_ENCRYPTION_KEY has not changed."), { status: 503 });
  }
}
