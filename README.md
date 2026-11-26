# GA4 Feature Journey Analyzer

TypeScript application for managing GA4-connected apps, discovering events, and comparing event populations across a feature's ordered event list. Event comparisons are aggregated event metrics; they are not user-level sequential funnels.

## Requirements

- Node.js 20+
- A Supabase PostgreSQL connection string for database-backed features
- Google OAuth credentials and GA4 read access for Analytics features

## Local development

1. Copy `.env.example` to `.env` and set `DATABASE_URL`. The backend loads `.env.local` and `.env` from the workspace root; process environment variables take precedence. Use the Supabase pooler URL (with SSL enabled) for the application. Do not expose this URL to the browser.
2. Set Google OAuth credentials and secrets when enabling OAuth/GA4.
3. Run `npm install`, then `npm run install:all`.
4. Create/update the database schema with `npm run prisma:migrate --prefix backend`.
5. Start both applications with `npm run dev`.

The frontend is at `http://localhost:5173`, the API at `http://localhost:3000`, and the liveness endpoint at `http://localhost:3000/health`. The health endpoint does not require Google credentials or a database connection.

## Supabase and Prisma

Set `DATABASE_URL` to the Supabase PostgreSQL connection string. Prisma is the only database access layer. Use a pooled Supabase URL for runtime and a direct connection URL for migrations when required by your Supabase configuration; point `DATABASE_URL` at that direct URL only while running a migration if your pooler does not support Prisma migrations. No local database is provisioned.

After changing the Prisma schema, stop any running backend process, run `npm run prisma:generate --prefix backend`, then restart the app. If a database column is also new, apply its migration before restarting.

To create the initial schema from the Supabase Dashboard, open the SQL Editor, paste and run [`supabase/query.sql`](./supabase/query.sql) once on a new database. If you already created the database before app metadata was added, run [`supabase/migrations/20261126230000_add_app_metadata.sql`](./supabase/migrations/20261126230000_add_app_metadata.sql) in the SQL Editor; it adds `package_name`, `app_url`, `app_icon_data`, and `app_icon_url` to the existing `apps` table and is safe to rerun. For future schema changes, use Prisma migrations.

## Docker

Copy `.env.example` to `.env`, configure the same Supabase `DATABASE_URL` and backend credentials, then run `docker compose up --build`. Compose builds the frontend with a public API base URL pointing at the backend; it does not create a database container.

## Google OAuth

Register the callback URL in Google Cloud as `GOOGLE_REDIRECT_URI`, enable the Google Analytics Data API, and grant the OAuth client read-only Analytics scope. `TOKEN_ENCRYPTION_KEY` must be a 32-byte hexadecimal value and `SESSION_SECRET` must be a long random secret. OAuth credentials and tokens remain server-side.

## Commands

- `npm run dev` — starts frontend and backend
- `npm run build` — builds both projects
- `npm run start` — starts the built backend
- `npm run install:all` — installs root, backend, and frontend dependencies
- `npm run prisma:migrate --prefix backend` — applies Prisma migrations
- `npm run prisma:generate --prefix backend` — generates Prisma Client

## Analytics interpretation

The Journey Analyzer preserves each feature's configured event order and supports arbitrary event counts, including 50+. For each event it reports active users and event counts. Drop percentage compares the active-user populations of adjacent events using the configured formula; it does not assert that users fired those events in sequence.
