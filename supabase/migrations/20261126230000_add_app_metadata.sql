-- Upgrade an existing Supabase database with the app metadata columns.
-- Safe to run more than once.

ALTER TABLE public.apps
    ADD COLUMN IF NOT EXISTS package_name TEXT,
    ADD COLUMN IF NOT EXISTS app_url TEXT,
    ADD COLUMN IF NOT EXISTS app_icon_data TEXT,
    ADD COLUMN IF NOT EXISTS app_icon_url TEXT;
