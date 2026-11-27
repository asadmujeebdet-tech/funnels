# Single-service open deployment

This branch runs Funnels as **one Render Web Service**. Express serves both the API and the built React frontend from the same origin. There is no separate Render Static Site and no frontend API URL to configure.

Anyone with the public URL can view and modify the shared workspace. Do not use this mode for confidential data or expose it beyond the intended team.

## Render deployment

Create one **Web Service** connected to this repository and select branch `open-deploy`.

- Root Directory: leave blank (repository root)
- Build Command: `npm run install:all && npm run build`
- Start Command: `npm start`

The build installs dependencies independently in the root, backend, and frontend, then builds the Vite frontend and compiles the backend. Express serves `frontend/dist` and all `/api/v1` routes from the same Render URL.

## Render environment variables

Keep the existing PostgreSQL connection string so existing apps, funnels, reports, and sync history are preserved.

Required/general:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=YOUR_EXISTING_POSTGRES_CONNECTION_STRING
FRONTEND_URL=https://funnels-6ncp.onrender.com
BACKEND_URL=https://funnels-6ncp.onrender.com
SYNC_ENABLED=false
SYNC_TIMEZONE=Asia/Karachi
```

Google OAuth (use your existing Google OAuth **Web application** client):

```env
GOOGLE_CLIENT_ID=YOUR_OAUTH_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_OAUTH_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://funnels-6ncp.onrender.com/api/v1/auth/google/callback
GOOGLE_OAUTH_SETUP_SECRET=GENERATE_A_LONG_RANDOM_SECRET
```

Do not set `VITE_API_BASE_URL` for this single-service deployment. The frontend calls the API on the same Render origin.

## Google Cloud configuration

1. Open Google Cloud project `funnels-515914`.
2. Enable **Google Analytics Data API**.
3. Open **Google Auth Platform → Branding** and configure the consent screen.
4. Under **Audience**, add the Google account that owns or can access the GA4 properties as a test user if the app is in Testing mode. For a long-lived production refresh token, publish the OAuth app as appropriate for your organization's policy.
5. Open **Clients** and use a client of type **Web application**.
6. Add this exact Authorized redirect URI:
   `https://funnels-6ncp.onrender.com/api/v1/auth/google/callback`
7. Save the OAuth client ID and secret in the Render variables above.
8. In Google Analytics Admin → Property access management, grant that same Google account at least **Viewer** access to each GA4 property used by Funnels.

The app requests the `analytics.readonly` scope only. It does not require a service-account JSON key, so it works around organizations that block service-account key creation.

## Connect the shared Google account

1. Deploy the `open-deploy` branch with the variables above.
2. Open `https://funnels-6ncp.onrender.com/api/v1/auth/google`.
3. Enter the value of `GOOGLE_OAUTH_SETUP_SECRET` when prompted.
4. Sign in to the Google account that has Viewer access to your GA4 properties and approve read-only Analytics access.
5. The callback saves the refresh token in the existing `google_connections` table in PostgreSQL. Tokens are not written to the browser or GitHub.
6. Return to Funnels. The header should show **GA4 Connected**.

The setup secret is required to start the OAuth connection so an ordinary visitor to the public dashboard cannot replace the shared Google account. Keep it private. If you need to reconnect another Google account, rotate the setup secret in Render and repeat the process.

## Add GA4 properties

For each app, open **Manage Apps → Add App** (or edit an existing app) and enter its numeric GA4 Property ID. Save it, then use **Test connection**. The connected Google account must have Viewer access to that property.

Overview, event discovery, funnel journeys, and campaign reports query the Google Analytics Data API. If GA4 returns no rows, the dashboard shows empty states or em dashes; it does not substitute sample analytics values. Campaign cost metrics are available only when the GA4 property is linked to Google Ads and Google exposes those metrics.

## Database

On startup, existing apps are reassigned to the shared workspace profile; their associated funnels, events, saved reports, and sync history remain attached to those apps. The existing migration already creates the `google_connections` table used to store the shared OAuth refresh token.

## Important security warning

There is no employee login or access restriction in this mode. Anyone with the dashboard URL can add, edit, or delete apps and funnels and trigger analytics requests. The Google OAuth setup secret protects the Google-account connection flow, but it does not protect dashboard data or write operations. Use a private network or access-control layer if this is not acceptable.
