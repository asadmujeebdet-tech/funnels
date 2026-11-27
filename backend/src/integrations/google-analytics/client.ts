import { BetaAnalyticsDataClient, v1alpha } from "@google-analytics/data";
import { OAuth2Client, JWT } from "google-auth-library";
import { config } from "../../config/env";
import { prisma } from "../../config/prisma";

let serviceAccountClient: JWT | null = null;

function getServiceAccountClient(): JWT {
  if (serviceAccountClient) return serviceAccountClient;

  let email = config.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = config.GOOGLE_PRIVATE_KEY;

  if (config.GOOGLE_SERVICE_ACCOUNT_JSON) {
    let credentials: { client_email?: string; private_key?: string };
    try {
      credentials = JSON.parse(config.GOOGLE_SERVICE_ACCOUNT_JSON) as typeof credentials;
    } catch {
      throw Object.assign(new Error("GOOGLE_SERVICE_ACCOUNT_JSON must contain valid service-account JSON"), { status: 503 });
    }
    email = credentials.client_email;
    privateKey = credentials.private_key;
  }

  if (!email || !privateKey) {
    throw Object.assign(new Error("No Google Analytics credentials are configured. Connect the shared Google account or configure a service account."), { status: 503 });
  }

  serviceAccountClient = new JWT({
    email,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  return serviceAccountClient;
}

async function getGoogleAuthClient(): Promise<OAuth2Client | JWT> {
  if (config.GOOGLE_SERVICE_ACCOUNT_JSON || (config.GOOGLE_SERVICE_ACCOUNT_EMAIL && config.GOOGLE_PRIVATE_KEY)) {
    return getServiceAccountClient();
  }

  const connection = await prisma.googleConnection.findUnique({
    where: { profileId: "open-deploy-shared" },
    select: { refreshToken: true },
  });
  if (!connection?.refreshToken) {
    throw Object.assign(new Error("Google Analytics is not connected. Use Connect Google Analytics in the dashboard."), { status: 503 });
  }
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    throw Object.assign(new Error("Google OAuth client credentials are missing from the backend environment."), { status: 503 });
  }

  const client = new OAuth2Client(config.GOOGLE_CLIENT_ID, config.GOOGLE_CLIENT_SECRET, config.GOOGLE_REDIRECT_URI);
  client.setCredentials({ refresh_token: connection.refreshToken });
  return client;
}

/** All visitors use the company's shared, read-only GA4 Google account. */
export async function getAnalyticsClient(_profileId?: string): Promise<BetaAnalyticsDataClient> {
  return new BetaAnalyticsDataClient({ authClient: await getGoogleAuthClient() });
}

/** The funnel report lives in the v1alpha Data API. */
export async function getFunnelClient(_profileId?: string): Promise<v1alpha.AlphaAnalyticsDataClient> {
  return new v1alpha.AlphaAnalyticsDataClient({ authClient: await getGoogleAuthClient() });
}
