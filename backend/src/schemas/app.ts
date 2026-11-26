import { z } from "zod";

export const createAppSchema = z.object({
  name: z.string().trim().min(1).max(120),
  ga4PropertyId: z.string().trim().regex(/^\d+$/).optional().or(z.literal("")),
});

export const createFeatureSchema = z.object({
  name: z.string().trim().min(1).max(120),
  events: z.array(z.string().trim().min(1).max(200)).min(1).max(500)
    .transform((events) => events.filter((event, index) => events.indexOf(event) === index)),
});

export const dateRangeSchema = z.object({
  startDate: z.string().date(),
  endDate: z.string().date(),
  appVersion: z.string().trim().optional(),
}).refine(({ startDate, endDate }) => startDate <= endDate, {
  path: ["endDate"],
  message: "End date must be on or after start date",
});
