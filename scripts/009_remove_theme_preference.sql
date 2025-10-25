-- Migration: Remove theme_preference column from profiles
-- Safe steps:
-- 1) Ensure all existing rows have a known value ('light')
-- 2) Drop the column if it exists

BEGIN;

-- Make sure existing rows use 'light' so UI or queries that read the column
-- won't see unexpected values during migration window.
UPDATE profiles
SET theme_preference = 'light'
WHERE theme_preference IS DISTINCT FROM 'light'
   OR theme_preference IS NULL;

-- Drop the column if present (Postgres supports IF EXISTS on DROP COLUMN)
ALTER TABLE profiles
DROP COLUMN IF EXISTS theme_preference;

COMMIT;

-- Notes:
-- - Run this migration in your DB environment (psql/supabase) after verifying
--   backups and before changing any code that relies on the column.
-- - For zero-downtime, ensure the app no longer reads/writes this column
--   before dropping; this repo's code has been updated to stop using it.
