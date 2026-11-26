import { z } from "zod";

const packageNameSchema = z.string().trim().min(1).max(255)
  .regex(/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/, "Enter a valid package or bundle identifier");

const appUrlSchema = z.string().trim().url().max(2048).refine((value) => {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password;
  } catch {
    return false;
  }
}, "Enter a valid HTTP or HTTPS app URL");

export function isSafeAppIconDataUrl(value: string): boolean {
  if (value.length > 700_000) {
    return false;
  }
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) {
    return false;
  }
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > 512 * 1024 || bytes.toString("base64") !== match[2]) {
    return false;
  }
  if (match[1] === "png") {
    return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (match[1] === "jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP";
}

const appIconDataSchema = z.string().refine(isSafeAppIconDataUrl, {
  message: "Icon must be a PNG, JPEG, or WebP data URL no larger than 512 KB",
});
const appIconUrlSchema = z.string().url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" &&
    (url.hostname === "googleusercontent.com" || url.hostname.endsWith(".googleusercontent.com"));
}, "App icon URLs must use HTTPS and a Google-hosted image domain");

export const createAppSchema = z.object({
  name: z.string().trim().min(1).max(120),
  ga4PropertyId: z.string().trim().regex(/^\d+$/).optional().or(z.literal("")),
  packageName: packageNameSchema.nullable().optional(),
  appUrl: appUrlSchema.nullable().optional(),
  appIconData: appIconDataSchema.nullable().optional(),
  appIconUrl: appIconUrlSchema.nullable().optional(),
});

export const createFeatureSchema = z.object({
  name: z.string().trim().min(1).max(120),
  events: z.array(z.string().min(1).max(200).refine((event) => event.trim().length > 0, "Event names cannot be blank"))
    .min(1).max(500)
    .refine((events) => new Set(events).size === events.length, "Event names must be unique"),
});

export const dateRangeSchema = z.object({
  startDate: z.string().date(),
  endDate: z.string().date(),
  appVersion: z.string().trim().optional(),
  country: z.string().trim().optional(),
}).refine(({ startDate, endDate }) => startDate <= endDate, {
  path: ["endDate"],
  message: "End date must be on or after start date",
});

export const updateFeatureSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  events: createFeatureSchema.shape.events.optional(),
}).refine((data) => data.name !== undefined || data.events !== undefined, {
  message: "At least one feature field must be provided",
});
