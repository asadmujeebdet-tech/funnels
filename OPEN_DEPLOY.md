# Open deployment configuration

This branch runs the Funnels dashboard as a shared, no-login workspace. Anyone who can reach the deployed URL can view and modify the shared workspace. Do not use this mode for confidential data or expose it beyond the intended team.

## Required backend environment

Set these variables in the backend Render service (Environment tab). Do not commit a real `.env` file or service-account JSON to GitHub.

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=YOUR_EXISTING_POSTGRES_CONNECTION_STRING
FRONTEND_URL=https://YOUR-FRONTEND.onrender.com
BACKEND_URL=https://YOUR-BACKEND.onrender.com
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"...","client_id":"...","token_uri":"https://oauth2.googleapis.com/token"}
SYNC_ENABLED=false
SYNC_TIMEZONE=Asia/Karachi
```

You may use `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` instead of `GOOGLE_SERVICE_ACCOUNT_JSON`.

## Google Analytics access

1. Create a Google Cloud service account and enable the Google Analytics Data API.
2. Add the service account email as **Viewer** on every GA4 property used by this dashboard.
3. Put the service account JSON in the backend Render environment variable `GOOGLE_SERVICE_ACCOUNT_JSON`.
4. Keep the service-account private key private. Never upload it into this repository.

The backend uses this one read-only service account for every visitor. Employees do not sign in to Google.

## Render services

- **Backend Web Service**: root directory `backend`; build command `npm install && npm run build`; start command `npm start`.
- **Frontend Static Site**: root directory `frontend`; build command `npm install && npm run build`; publish directory `dist`.
- Set frontend build environment variable `VITE_API_BASE_URL=https://YOUR-BACKEND.onrender.com/api/v1`.
- Set backend `FRONTEND_URL` to the exact frontend URL and `BACKEND_URL` to the backend URL.
- Use the same existing PostgreSQL `DATABASE_URL` to retain the current apps, funnels, reports, and sync history.

On backend startup, existing apps are reassigned to the shared workspace profile. Their associated funnels, events, saved reports, and sync history remain attached to those apps.

## Important

There is no login or access restriction in this mode. Anyone with the URL can add, edit, or delete apps and funnels and can trigger analytics requests. The backend service-account key remains server-side, but the dashboard data and write operations are public to URL holders. Use a private network or an access-control layer if this is not acceptable.
