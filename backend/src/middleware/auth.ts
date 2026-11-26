import type { NextFunction, Request, Response } from "express";
import { config } from "../config/env";
import { signValue, verifyValue } from "../utils/crypto";

const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

declare global {
  namespace Express {
    interface Request {
      profileId?: string;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const signed = req.cookies?.session as string | undefined;
  const payload = signed ? verifyValue(signed) : null;
  if (!payload) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const [profileId, expiresAt] = payload.split(":");
  if (!profileId || !expiresAt || Number(expiresAt) <= Date.now()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  req.profileId = profileId;
  // Sliding session: renew the cookie once less than 15 days remain so active users stay signed in.
  if (Number(expiresAt) - Date.now() < SESSION_MS / 2) {
    res.cookie("session", signValue(`${profileId}:${Date.now() + SESSION_MS}`), {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MS,
    });
  }
  next();
}
