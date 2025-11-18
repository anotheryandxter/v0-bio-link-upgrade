-- Migration: add Jakarta-local column and create non-destructive Jakarta-aware aggregates
-- This migration is NON-DESTRUCTIVE: it does NOT drop or replace the existing
-- `monthly_link_stats` view. Instead it creates a new materialized view
-- `monthly_link_stats_jakarta` and Jakarta-aware RPCs suffixed with `_jakarta`.
-- After you verify results, you may choose to swap the views or update the app
-- to use the Jakarta-aware view/RPCs.

-- 1) Add generated local-time column to link_clicks (non-destructive)
ALTER TABLE IF EXISTS public.link_clicks
  ADD COLUMN IF NOT EXISTS clicked_at_jakarta TIMESTAMP GENERATED ALWAYS AS (clicked_at AT TIME ZONE 'Asia/Jakarta') STORED;

CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at_jakarta ON public.link_clicks (clicked_at_jakarta);

-- 2) Create a new materialized view monthly_link_stats_jakarta using Jakarta month boundaries
-- Do NOT drop the existing public.monthly_link_stats; keep it until you verify.
DROP MATERIALIZED VIEW IF EXISTS public.monthly_link_stats_jakarta;

CREATE MATERIALIZED VIEW public.monthly_link_stats_jakarta AS
SELECT
  l.id AS link_id,
  l.profile_id,
  l.title,
  date_trunc('month', (lc.clicked_at AT TIME ZONE 'Asia/Jakarta'))::date AS month,
  count(*) AS clicks
FROM public.link_clicks lc
JOIN public.links l ON lc.link_id = l.id
GROUP BY l.id, l.profile_id, l.title, date_trunc('month', (lc.clicked_at AT TIME ZONE 'Asia/Jakarta'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_link_stats_jakarta_link_month ON public.monthly_link_stats_jakarta (link_id, month);
CREATE INDEX IF NOT EXISTS idx_monthly_link_stats_jakarta_profile_month ON public.monthly_link_stats_jakarta (profile_id, month);

-- 3) Refresh helper for the jakarta view
CREATE OR REPLACE FUNCTION public.refresh_monthly_link_stats_jakarta()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.monthly_link_stats_jakarta;
END;
$$;

-- 4) Create Jakarta-aware RPCs (non-destructive, suffixed with _jakarta)
CREATE OR REPLACE FUNCTION public.get_monthly_stats_jakarta(p_profile_id uuid)
RETURNS TABLE(link_id uuid, title text, month date, clicks int)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT l.id AS link_id,
         l.title,
         date_trunc('month', (lc.clicked_at AT TIME ZONE 'Asia/Jakarta'))::date AS month,
         COUNT(*)::int AS clicks
  FROM public.link_clicks lc
  JOIN public.links l ON lc.link_id = l.id
  WHERE l.profile_id = p_profile_id
  GROUP BY l.id, l.title, date_trunc('month', (lc.clicked_at AT TIME ZONE 'Asia/Jakarta'))
  ORDER BY month;
$$;

CREATE OR REPLACE FUNCTION public.get_link_stats_jakarta(
  p_profile_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_link_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit int DEFAULT NULL,
  p_offset int DEFAULT 0
)
RETURNS TABLE(link_id uuid, title text, url text, month date, clicks int)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT l.id AS link_id,
         l.title,
         l.url,
         date_trunc('month', (lc.clicked_at AT TIME ZONE 'Asia/Jakarta'))::date AS month,
         COUNT(*)::int AS clicks
  FROM public.link_clicks lc
  JOIN public.links l ON lc.link_id = l.id
  WHERE l.profile_id = p_profile_id
    AND (p_link_id IS NULL OR l.id = p_link_id)
    AND (p_search IS NULL OR (l.title ILIKE '%' || p_search || '%' OR l.url ILIKE '%' || p_search || '%'))
    AND (p_start_date IS NULL OR (lc.clicked_at AT TIME ZONE 'Asia/Jakarta') >= p_start_date::timestamp)
    AND (p_end_date IS NULL OR (lc.clicked_at AT TIME ZONE 'Asia/Jakarta') < (p_end_date::timestamp + INTERVAL '1 day'))
  GROUP BY l.id, l.title, l.url, date_trunc('month', (lc.clicked_at AT TIME ZONE 'Asia/Jakarta'))
  ORDER BY month DESC, clicks DESC
  LIMIT COALESCE(p_limit, NULL) OFFSET COALESCE(p_offset, 0);
$$;

CREATE OR REPLACE FUNCTION public.get_link_stats_count_jakarta(
  p_profile_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL,
  p_link_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL
)
RETURNS TABLE(total bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::bigint AS total
  FROM (
    SELECT 1
    FROM public.link_clicks lc
    JOIN public.links l ON lc.link_id = l.id
    WHERE l.profile_id = p_profile_id
      AND (p_link_id IS NULL OR l.id = p_link_id)
      AND (p_search IS NULL OR (l.title ILIKE '%' || p_search || '%' OR l.url ILIKE '%' || p_search || '%'))
      AND (p_start_date IS NULL OR (lc.clicked_at AT TIME ZONE 'Asia/Jakarta') >= p_start_date::timestamp)
      AND (p_end_date IS NULL OR (lc.clicked_at AT TIME ZONE 'Asia/Jakarta') < (p_end_date::timestamp + INTERVAL '1 day'))
  ) sub;
$$;

-- 5) Notes and verification instructions:
-- - This migration is safe to run in production. It does not remove or replace
--   the existing `monthly_link_stats` view. Instead it creates a parallel
--   `monthly_link_stats_jakarta` view and Jakarta-aware RPCs suffixed `_jakarta`.
-- - After running this migration, verify that `monthly_link_stats_jakarta` has
--   the expected totals and that `clicked_at_jakarta` shows UTC+7 local times.
-- - When you're satisfied, you can either:
--     a) Update the app to use `monthly_link_stats_jakarta` or the `_jakarta` RPCs,
--        and when confident, drop/rename the old view; OR
--     b) Swap the views atomically during a maintenance window by creating a
--        new view/table and renaming/dropping the old one. Be aware this can
--        require exclusive locks; perform during low traffic.
--
-- Example verification queries:
-- SELECT id, clicked_at, clicked_at_jakarta FROM public.link_clicks ORDER BY clicked_at DESC LIMIT 5;
-- SELECT * FROM public.monthly_link_stats_jakarta WHERE profile_id = '<PROFILE_UUID>' ORDER BY month DESC LIMIT 20;
-- SELECT link_id, SUM(clicks) FROM public.monthly_link_stats_jakarta WHERE profile_id = '<PROFILE_UUID>' GROUP BY link_id ORDER BY SUM(clicks) DESC;

-- End of migration
