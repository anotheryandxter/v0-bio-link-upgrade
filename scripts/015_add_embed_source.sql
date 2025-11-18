-- Migration: add `source` column to link_clicks to capture embed slugs
-- Non-destructive: adds a nullable text column and an index for filtering

ALTER TABLE IF EXISTS public.link_clicks
  ADD COLUMN IF NOT EXISTS source TEXT;

CREATE INDEX IF NOT EXISTS idx_link_clicks_source ON public.link_clicks (source);

-- Notes:
-- - This column is nullable and safe to add in production.
-- - The embed redirect handler will populate `source` with the incoming
--   `source` query parameter (embed slug) so you can filter or attribute
--   embed-originated clicks later when analyzing data.
