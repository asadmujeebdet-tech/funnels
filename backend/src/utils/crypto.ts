import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { config } from "../config/env";

function requiredSecret(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required for this operation`);
  }
  return value;
}

function encryptionKey(): Buffer {
  const key = Buffer.from(requiredSecret(config.TOKEN_ENCRYPTION_KEY, "TOKEN_ENCRYPTION_KEY"), "hex");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be a 32-byte hexadecimal value");
  }
  return key;
}

export function encrypt(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decrypt(value: string): string {
  const [iv, authTag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
  if (!iv || !authTag || !encrypted) {
    throw new Error("Stored Google token has an invalid encrypted format");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function signature(payload: string): Buffer {
  const secret = requiredSecret(config.SESSION_SECRET, "SESSION_SECRET");
  return createHmac("sha256", secret).update(payload).digest();
}

export function signValue(payload: string): string {
  return `${payload}.${signature(payload).toString("base64url")}`;
}

export function verifyValue(value: string): string | null {
  const separator = value.lastIndexOf(".");
  if (separator < 0 || !config.SESSION_SECRET) {
    return null;
  }
  const payload = value.slice(0, separator);
  const supplied = Buffer.from(value.slice(separator + 1), "base64url");
  const expected = signature(payload);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected) ? payload : null;
}
