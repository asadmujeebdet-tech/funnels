-- Initial database schema for the GA4 Feature Journey Analyzer.
-- Run once in the Supabase SQL Editor. This mirrors the Prisma initial migration.
-- For an existing database, run supabase/migrations/20261126230000_add_app_metadata.sql instead.

CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "apps" (
    "apps_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ga4_property_id" TEXT,
    "package_name" TEXT,
    "app_url" TEXT,
    "app_icon_data" TEXT,
    "app_icon_url" TEXT,
    "owner_profile_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "apps_pkey" PRIMARY KEY ("apps_id")
);

CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "google_sub" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "google_connections" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_expiry" TIMESTAMP(3),
    "scopes" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "google_connections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "features" (
    "id" TEXT NOT NULL,
    "apps_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "feature_events" (
    "id" TEXT NOT NULL,
    "feature_id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "feature_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fact_ga4_event_daily" (
    "id" TEXT NOT NULL,
    "apps_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "event_name" TEXT NOT NULL,
    "app_version" TEXT NOT NULL DEFAULT '(not set)',
    "active_users" INTEGER NOT NULL,
    "event_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "fact_ga4_event_daily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "saved_reports" (
    "id" TEXT NOT NULL,
    "apps_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "saved_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sync_jobs" (
    "id" TEXT NOT NULL,
    "apps_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sync_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_logs" (
    "id" TEXT NOT NULL,
    "apps_id" TEXT,
    "endpoint" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "apps_owner_profile_id_idx" ON "apps"("owner_profile_id");
CREATE UNIQUE INDEX "profiles_google_sub_key" ON "profiles"("google_sub");
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");
CREATE UNIQUE INDEX "google_connections_profile_id_key" ON "google_connections"("profile_id");
CREATE INDEX "features_apps_id_idx" ON "features"("apps_id");
CREATE UNIQUE INDEX "features_apps_id_name_key" ON "features"("apps_id", "name");
CREATE INDEX "feature_events_feature_id_position_idx" ON "feature_events"("feature_id", "position");
CREATE UNIQUE INDEX "feature_events_feature_id_event_name_key" ON "feature_events"("feature_id", "event_name");
CREATE UNIQUE INDEX "feature_events_feature_id_position_key" ON "feature_events"("feature_id", "position");
CREATE INDEX "fact_ga4_event_daily_apps_id_date_idx" ON "fact_ga4_event_daily"("apps_id", "date");
CREATE UNIQUE INDEX "fact_ga4_event_daily_apps_id_date_event_name_app_version_key"
    ON "fact_ga4_event_daily"("apps_id", "date", "event_name", "app_version");
CREATE INDEX "saved_reports_apps_id_idx" ON "saved_reports"("apps_id");
CREATE INDEX "sync_jobs_apps_id_status_idx" ON "sync_jobs"("apps_id", "status");
CREATE INDEX "api_logs_created_at_idx" ON "api_logs"("created_at");

ALTER TABLE "apps"
    ADD CONSTRAINT "apps_owner_profile_id_fkey"
    FOREIGN KEY ("owner_profile_id") REFERENCES "profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "google_connections"
    ADD CONSTRAINT "google_connections_profile_id_fkey"
    FOREIGN KEY ("profile_id") REFERENCES "profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "features"
    ADD CONSTRAINT "features_apps_id_fkey"
    FOREIGN KEY ("apps_id") REFERENCES "apps"("apps_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "feature_events"
    ADD CONSTRAINT "feature_events_feature_id_fkey"
    FOREIGN KEY ("feature_id") REFERENCES "features"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "fact_ga4_event_daily"
    ADD CONSTRAINT "fact_ga4_event_daily_apps_id_fkey"
    FOREIGN KEY ("apps_id") REFERENCES "apps"("apps_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saved_reports"
    ADD CONSTRAINT "saved_reports_apps_id_fkey"
    FOREIGN KEY ("apps_id") REFERENCES "apps"("apps_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sync_jobs"
    ADD CONSTRAINT "sync_jobs_apps_id_fkey"
    FOREIGN KEY ("apps_id") REFERENCES "apps"("apps_id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "api_logs"
    ADD CONSTRAINT "api_logs_apps_id_fkey"
    FOREIGN KEY ("apps_id") REFERENCES "apps"("apps_id")
    ON DELETE SET NULL ON UPDATE CASCADE;
