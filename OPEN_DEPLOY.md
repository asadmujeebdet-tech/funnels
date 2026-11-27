# Single-service open deployment

This branch runs Funnels as **one Render Web Service**. Express serves both the API and the built React frontend from the same origin. There is no separate Render Static Site and no frontend API URL to configure.

Anyone with the public URL can view and modify the shared workspace. Do not use this mode for confidential data or expose it beyond the intended team.

## Render deployment

Create one **Web Service** connected to this repository and select branch `open-deploy`.

- Root Directory: leave blank (repository root)
- Build Command: `npm run install:all && npm run build`
- Start Command: `npm start`

The build installs dependencies for the root, backend, and frontend, builds the Vite frontend first, and then compiles the backend. Express serves `frontend/dist` and all `/api/v1` routes from the same Render URL.

## Environment variables

Add these in the single Render Web Service's Environment tab:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=YOUR_EXISTING_POSTGRES_CONNECTION_STRING
FRONTEND_URL=https://YOUR-ONE-SERVICE.onrender.com
BACKEND_URL=https://YOUR-ONE-SERVICE.onrender.com
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n","client_email":"...","client_id":"...","token_uri":"https://oauth2.googleapis.com/token"}
SYNC_ENABLED=false
SYNC_TIMEZONE=Asia/Karachi
```

You can use `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` instead of `GOOGLE_SERVICE_ACCOUNT_JSON`.

Do not commit a real `.env` file or service-account JSON/private key to GitHub. Keep secrets in Render environment variables.

## Google Analytics access

1. Create a Google Cloud service account and enable the Google Analytics Data API.
2. Add the service account email as **Viewer** on every GA4 property used by this dashboard.
3. Store the service-account JSON in Render as `GOOGLE_SERVICE_ACCOUNT_JSON`.
4. Employees do not need individual Google sign-in.

## Database

Use the existing PostgreSQL `DATABASE_URL` to retain current apps, funnels, reports, and sync history. On startup, existing apps are reassigned to the shared workspace profile; their associated funnels, events, saved reports, and sync history remain attached to those apps.

## Important security warning

There is no login or access restriction in this mode. Anyone with the URL can add, edit, or delete apps and funnels and trigger analytics requests. The service-account key stays on the server, but dashboard data and write operations are public to URL holders. Use a private network or access-control layer if this is not acceptable.
