import type { NextFunction, Request, Response } from "express";

/**
 * Open deployment mode: every visitor shares one workspace identity.
 * This is intentionally not user authentication. Anyone with the URL can use
 * the dashboard, so do not expose this deployment to untrusted audiences.
 */
export const SHARED_PROFILE_ID = "open-deploy-shared";

declare global {
  namespace Express {
    interface Request {
      profileId?: string;
    }
  }
}

export function requireAuth(_req: Request, _res: Response, next: NextFunction): void {
  _req.profileId = SHARED_PROFILE_ID;
  next();
}
