import type { NextFunction, Request, Response } from "express";
import { verifyValue } from "../utils/crypto";

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
  next();
}
