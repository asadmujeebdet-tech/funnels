import type { NextFunction, Request, Response } from "express";

const requests = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_MINUTE = 30;

export function enforceGaQuota(req: Request, res: Response, next: NextFunction): void {
  const key = req.profileId ?? req.ip ?? "unknown";
  const recent = (requests.get(key) ?? []).filter((timestamp) => timestamp > Date.now() - WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_MINUTE) {
    res.status(429).json({ error: "GA4 request limit reached; retry in one minute" });
    return;
  }
  recent.push(Date.now());
  requests.set(key, recent);
  next();
}
