-- Migration: drop favicon column from profiles (now served as static asset)
BEGIN;
ALTER TABLE IF EXISTS profiles DROP COLUMN IF EXISTS favicon;
COMMIT;

-- Note: run this migration in your Supabase SQL editor or via psql.
