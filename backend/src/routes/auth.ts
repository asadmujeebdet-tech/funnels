import { randomBytes, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../config/prisma";
import { config } from "../config/env";
import { encryptGoogleToken } from "../security/token-crypto";
import { requireAuth, SHARED_PROFILE_ID } from "../middleware/auth";

export const authRouter = Router();

const scopes = ["openid", "email", "profile", "https://www.googleapis.com/auth/analytics.readonly"];
const stateCookie = "funnels_google_oauth_state";
const cookiePath = "/api/v1/auth/google";
const cookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: cookiePath,
  maxAge: 10 * 60 * 1000,
};

function oauthClient(): OAuth2Client {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    throw Object.assign(new Error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the Render environment first."), { status: 503 });
  }
  return new OAuth2Client(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, config.GOOGLE_REDIRECT_URI);
}

function page(title: string, message: string, success = false): string {
  const color = success ? "#047857" : "#b42318";
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font:16px system-ui;background:#f5f7fb;color:#182230;padding:40px"><main style="max-width:560px;margin:8vh auto;background:white;border:1px solid #e5e7eb;border-radius:16px;padding:32px"><h1>${title}</h1><p style="color:${color};line-height:1.6">${message}</p><a href="/overview">Return to Funnels</a></main></body></html>`;
}

// The setup secret prevents anyone who has the public dashboard URL from
// replacing the shared Google account connection.
authRouter.get("/google", (_req, res) => {
  if (!config.GOOGLE_OAUTH_SETUP_SECRET) {
    res.status(503).send(page("Google setup is locked", "Add GOOGLE_OAUTH_SETUP_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and TOKEN_ENCRYPTION_KEY to Render before connecting Google Analytics."));
    return;
  }
  res.type("html").send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect Google Analytics</title><body style="font:16px system-ui;background:#f5f7fb;color:#182230;padding:40px"><main style="max-width:440px;margin:8vh auto;background:white;border:1px solid #e5e7eb;border-radius:16px;padding:32px"><h1>Connect Google Analytics</h1><p>Enter the private setup secret configured in Render. This is only required by the workspace administrator.</p><form method="post" action="/api/v1/auth/google"><label for="setupSecret">Setup secret</label><input id="setupSecret" name="setupSecret" type="password" required autocomplete="current-password" style="display:block;box-sizing:border-box;width:100%;padding:12px;margin:8px 0 18px;border:1px solid #d0d5dd;border-radius:8px"><button style="padding:12px 18px;background:#4f46e5;color:white;border:0;border-radius:8px;cursor:pointer">Continue with Google</button></form></main></body></html>`);
});

authRouter.post("/google", async (req, res, next) => {
  try {
    const expected = config.GOOGLE_OAUTH_SETUP_SECRET ?? "";
    const supplied = String(req.body?.setupSecret ?? "");
    const expectedBuffer = Buffer.from(expected);
    const suppliedBuffer = Buffer.from(supplied);
    if (!expected || expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) {
      res.status(403).send(page("Access denied", "The setup secret is incorrect."));
      return;
    }

    // Validate encryption configuration before sending the administrator to Google.
    encryptGoogleToken("configuration-check");
    const state = randomBytes(32).toString("hex");
    res.cookie(stateCookie, state, cookieOptions);
    const url = oauthClient().generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: true,
      scope: scopes,
      state,
    });
    res.redirect(url);
  } catch (error) {
    next(error);
  }
});

authRouter.get("/google/callback", async (req, res) => {
  const expectedState = String(req.cookies?.[stateCookie] ?? "");
  const receivedState = String(req.query.state ?? "");
  res.clearCookie(stateCookie, { httpOnly: true, secure: config.NODE_ENV === "production", sameSite: "lax", path: cookiePath });
  if (!expectedState || !receivedState || expectedState !== receivedState) {
    res.status(400).send(page("Google connection failed", "The OAuth state check failed. Please restart the connection from the dashboard."));
    return;
  }
  if (req.query.error) {
    res.status(400).send(page("Google connection cancelled", "Google did not grant access. Return to Funnels and try again."));
    return;
  }

  try {
    const code = String(req.query.code ?? "");
    if (!code) {
      res.status(400).send(page("Google connection failed", "Google did not return an authorization code."));
      return;
    }
    const client = oauthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token) {
      res.status(400).send(page("Google connection failed", "Google did not return an access token. Please restart the connection."));
      return;
    }
    const existing = await prisma.googleConnection.findUnique({
      where: { profileId: SHARED_PROFILE_ID },
      select: { refreshToken: true },
    });
    const storedRefreshToken = tokens.refresh_token
      ? encryptGoogleToken(tokens.refresh_token)
      : existing?.refreshToken;
    if (!storedRefreshToken) {
      res.status(400).send(page("Google connection incomplete", "Google did not return a refresh token. Remove this app's access from your Google Account security settings, then restart the connection and approve access again."));
      return;
    }
    await prisma.googleConnection.upsert({
      where: { profileId: SHARED_PROFILE_ID },
      create: {
        profileId: SHARED_PROFILE_ID,
        accessToken: encryptGoogleToken(tokens.access_token),
        refreshToken: storedRefreshToken,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scopes: tokens.scope ?? scopes.join(" "),
      },
      update: {
        accessToken: encryptGoogleToken(tokens.access_token),
        refreshToken: storedRefreshToken,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        scopes: tokens.scope ?? scopes.join(" "),
      },
    });
    res.send(page("Google Analytics connected", "The shared Google account is connected. Funnels will now request live GA4 reports using read-only Analytics access.", true));
  } catch (error) {
    console.error("Google Analytics OAuth callback failed", error);
    res.status(500).send(page("Google connection failed", "The authorization could not be saved. Check the Render runtime logs and verify the database connection."));
  }
});

// Shared workspace initialization; employee Google sign-in is not required.
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
    const connection = await prisma.googleConnection.findUnique({
      where: { profileId: SHARED_PROFILE_ID },
      select: { refreshToken: true },
    });
    const serviceAccountConfigured = Boolean(config.GOOGLE_SERVICE_ACCOUNT_JSON || (config.GOOGLE_SERVICE_ACCOUNT_EMAIL && config.GOOGLE_PRIVATE_KEY));
    res.json({ profile, googleConnected: serviceAccountConfigured || Boolean(connection?.refreshToken) });
  } catch (error) {
    next(error);
  }
});

// There is no user session to end in open deployment mode.
authRouter.post("/logout", (_req, res) => res.status(204).end());
