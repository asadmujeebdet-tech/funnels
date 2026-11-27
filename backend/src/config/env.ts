import dotenv from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

for (const path of [
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "..", ".env.local"),
  resolve(process.cwd(), "..", ".env"),
]) {
  dotenv.config({ path });
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  BACKEND_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_REDIRECT_URI: z.string().url().default("http://localhost:3000/api/v1/auth/google/callback"),
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
  GA4_CACHE_TTL: z.coerce.number().int().nonnegative().default(900),
  GA4_DEFAULT_DISCOVERY_DAYS: z.coerce.number().int().positive().default(90),
  SYNC_ENABLED: z.string().default("false"),
  SYNC_TIMEZONE: z.string().default("Asia/Karachi"),
});

export const config = envSchema.parse(process.env);
