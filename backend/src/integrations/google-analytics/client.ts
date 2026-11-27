import { BetaAnalyticsDataClient, v1alpha } from "@google-analytics/data";
import { UserRefreshClient } from "google-auth-library";
import { config } from "../../config/env";
import { prisma } from "../../config/prisma";
import { decrypt, encrypt } from "../../utils/crypto";

async function getOAuthClient(profileId: string): Promise<UserRefreshClient> {
  const connection = await prisma.googleConnection.findUnique({ where: { profileId } });
  if (!connection) {
    throw Object.assign(new Error("Connect a Google account before using GA4"), { status: 401 });
  }
  if (!connection.refreshToken) {
    throw Object.assign(new Error("Reconnect Google with offline access to enable GA4 reporting"), { status: 401 });
  }

  const oauth = new UserRefreshClient({
    clientId: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    refreshToken: decrypt(connection.refreshToken),
  });
  oauth.setCredentials({
    access_token: decrypt(connection.accessToken),
    refresh_token: decrypt(connection.refreshToken),
    expiry_date: connection.tokenExpiry?.getTime(),
  });

  oauth.on("tokens", (tokens) => {
    void prisma.googleConnection.update({
      where: { profileId },
      data: {
        accessToken: tokens.access_token ? encrypt(tokens.access_token) : connection.accessToken,
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : connection.refreshToken,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : connection.tokenExpiry,
      },
    }).catch((error: unknown) => {
      console.error("Could not persist refreshed Google OAuth tokens", error);
    });
  });

  return oauth;
}

export async function getAnalyticsClient(profileId: string): Promise<BetaAnalyticsDataClient> {
  return new BetaAnalyticsDataClient({ authClient: await getOAuthClient(profileId) });
}

/** The funnel report lives in the v1alpha Data API. */
export async function getFunnelClient(profileId: string): Promise<v1alpha.AlphaAnalyticsDataClient> {
  return new v1alpha.AlphaAnalyticsDataClient({ authClient: await getOAuthClient(profileId) });
}
