import { randomUUID } from "node:crypto";
import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../config/prisma";
import { config } from "../config/env";
import { encrypt, signValue, verifyValue } from "../utils/crypto";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();
const scopes = ["openid", "email", "profile", "https://www.googleapis.com/auth/analytics.readonly"];
const cookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

function googleClient(): OAuth2Client {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    throw Object.assign(new Error("Google OAuth is not configured on the backend"), { status: 503 });
  }
  return new OAuth2Client(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, config.GOOGLE_REDIRECT_URI);
}

authRouter.get("/google", (req, res, next) => {
  try {
    const state = `${randomUUID()}:${Date.now() + 10 * 60 * 1000}`;
    res.cookie("oauth_state", signValue(state), { ...cookieOptions, maxAge: 10 * 60 * 1000 });
    res.redirect(googleClient().generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: scopes,
      state,
    }));
  } catch (error) {
    next(error);
  }
});

authRouter.get("/google/callback", async (req, res, next) => {
  try {
    const suppliedState = typeof req.query.state === "string" ? req.query.state : "";
    const signedState = req.cookies?.oauth_state as string | undefined;
    const expectedState = signedState ? verifyValue(signedState) : null;
    res.clearCookie("oauth_state", cookieOptions);
    if (!expectedState || expectedState !== suppliedState) {
      res.status(400).send("OAuth state validation failed");
      return;
    }

    const [, expiresAt] = expectedState.split(":");
    if (!expiresAt || Number(expiresAt) <= Date.now()) {
      res.status(400).send("OAuth state has expired");
      return;
    }
    if (typeof req.query.code !== "string") {
      res.status(400).send("Google did not return an authorization code");
      return;
    }

    const client = googleClient();
    const { tokens } = await client.getToken(req.query.code);
    if (!tokens.access_token) {
      throw new Error("Google OAuth did not return an access token");
    }
    client.setCredentials(tokens);
    const identity = await client.request<{
      sub: string;
      email?: string;
      name?: string;
    }>({ url: "https://openidconnect.googleapis.com/v1/userinfo" });
    if (!identity.data.sub || !identity.data.email) {
      throw new Error("Google account did not provide an email and subject");
    }

    const profile = await prisma.profile.upsert({
      where: { googleSub: identity.data.sub },
      create: { googleSub: identity.data.sub, email: identity.data.email, name: identity.data.name },
      update: { email: identity.data.email, name: identity.data.name },
    });
    await prisma.googleConnection.upsert({
      where: { profileId: profile.id },
      create: {
        profileId: profile.id,
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : null,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scopes: tokens.scope ?? scopes.join(" "),
      },
      update: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scopes: tokens.scope ?? scopes.join(" "),
      },
    });

    const session = `${profile.id}:${Date.now() + 7 * 24 * 60 * 60 * 1000}`;
    res.cookie("session", signValue(session), { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.redirect(config.FRONTEND_URL);
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: req.profileId },
      select: { id: true, email: true, name: true },
    });
    if (!profile) {
      res.clearCookie("session", cookieOptions);
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const connection = await prisma.googleConnection.findUnique({
      where: { profileId: profile.id },
      select: { id: true },
    });
    res.json({ profile, googleConnected: Boolean(connection) });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("session", cookieOptions);
  res.status(204).end();
});
