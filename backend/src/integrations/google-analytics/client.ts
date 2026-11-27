import { BetaAnalyticsDataClient, v1alpha } from "@google-analytics/data";
import { JWT } from "google-auth-library";
import { config } from "../../config/env";

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
    throw Object.assign(new Error("Configure GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY on the backend"), { status: 503 });
  }

  serviceAccountClient = new JWT({
    email,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
  });
  return serviceAccountClient;
}

/** All visitors use the company's shared, read-only GA4 service account. */
export async function getAnalyticsClient(_profileId?: string): Promise<BetaAnalyticsDataClient> {
  return new BetaAnalyticsDataClient({ authClient: getServiceAccountClient() });
}

/** The funnel report lives in the v1alpha Data API. */
export async function getFunnelClient(_profileId?: string): Promise<v1alpha.AlphaAnalyticsDataClient> {
  return new v1alpha.AlphaAnalyticsDataClient({ authClient: getServiceAccountClient() });
}
