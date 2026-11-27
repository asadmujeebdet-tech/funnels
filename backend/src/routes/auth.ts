import { Router } from "express";
import { prisma } from "../config/prisma";
import { config } from "../config/env";
import { requireAuth, SHARED_PROFILE_ID } from "../middleware/auth";

export const authRouter = Router();

// Compatibility endpoint used by the frontend to initialize the shared workspace.
// No employee Google sign-in or individual Google connection is required.
authRouter.get("/me", requireAuth, async (_req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: SHARED_PROFILE_ID },
      select: { id: true, email: true, name: true },
    });
    if (!profile) {
      res.status(503).json({ error: "Shared workspace is not initialized. Check backend startup logs." });
      return;
    }
    res.json({ profile, googleConnected: Boolean(config.GOOGLE_SERVICE_ACCOUNT_JSON || (config.GOOGLE_SERVICE_ACCOUNT_EMAIL && config.GOOGLE_PRIVATE_KEY)) });
  } catch (error) {
    next(error);
  }
});

// There is no user session to end in open deployment mode.
authRouter.post("/logout", (_req, res) => res.status(204).end());

// Old OAuth URLs are intentionally disabled to prevent accidental employee sign-in.
authRouter.get("/google", (_req, res) => {
  res.status(410).json({ error: "Individual Google sign-in is disabled. Configure the shared Google service account on the backend." });
});
authRouter.get("/google/callback", (_req, res) => {
  res.status(410).json({ error: "Individual Google sign-in is disabled." });
});
