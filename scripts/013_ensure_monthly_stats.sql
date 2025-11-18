-- Combined migration: ensure monthly materialized view, indexes, RPCs for analytics
-- Run this in Supabase SQL editor as a privileged user (service_role or DB owner).

-- 1) Ensure indexes on link_clicks for efficient queries
CREATE INDEX IF NOT EXISTS idx_link_clicks_user_identifier ON public.link_clicks(user_identifier);
CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at ON public.link_clicks (clicked_at);
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'link_clicks' AND column_name = 'profile_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_link_clicks_profile_clicked_at ON public.link_clicks (profile_id, clicked_at)';
  END IF;
END$$;
CREATE INDEX IF NOT EXISTS idx_link_clicks_link_clicked_at ON public.link_clicks (link_id, clicked_at);

-- 2) Create materialized view monthly_link_stats (if not exists)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.monthly_link_stats AS
SELECT
  l.id AS link_id,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='links' AND column_name='profile_id')
       THEN l.profile_id ELSE NULL END AS profile_id,
  l.title,
  date_trunc('month', lc.clicked_at)::date AS month,
  count(*) AS clicks
FROM public.link_clicks lc
JOIN public.links l ON lc.link_id = l.id
GROUP BY l.id, l.profile_id, l.title, date_trunc('month', lc.clicked_at);

-- Indexes to support CONCURRENTLY refresh and lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_link_stats_link_month ON public.monthly_link_stats (link_id, month);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='links' AND column_name='profile_id') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_monthly_link_stats_profile_month ON public.monthly_link_stats (profile_id, month)';
  END IF;
END$$;

-- 3) Refresh helper function
CREATE OR REPLACE FUNCTION public.refresh_monthly_link_stats()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Use CONCURRENTLY where supported to avoid blocking reads. Requires the unique index above.
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.monthly_link_stats;
END;
$$;

-- 4) RPCs used by the app: insert click dedup, get monthly/link stats, and count
CREATE OR REPLACE FUNCTION public.insert_click_if_not_exists(
  p_link_id uuid,
  p_user_identifier text,
  p_user_agent text,
  p_referrer text,
  p_ip inet,
  p_source text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If a user_identifier is provided, enforce dedupe within 24 hours for that identifier.
  -- If no user_identifier is provided (e.g. embed redirects), always insert the click.
  IF p_user_identifier IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.link_clicks
      WHERE link_id = p_link_id
        AND (user_identifier IS NOT DISTINCT FROM p_user_identifier)
        AND clicked_at >= NOW() - INTERVAL '24 hours'
    ) THEN
      INSERT INTO public.link_clicks (link_id, user_agent, referrer, ip_address, user_identifier, source)
      VALUES (p_link_id, p_user_agent, p_referrer, p_ip, p_user_identifier, p_source);
      RETURN TRUE;
    ELSE
      RETURN FALSE;
    END IF;
  ELSE
    INSERT INTO public.link_clicks (link_id, user_agent, referrer, ip_address, user_identifier, source)
    VALUES (p_link_id, p_user_agent, p_referrer, p_ip, p_user_identifier, p_source);
    RETURN TRUE;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_monthly_stats(p_profile_id uuid)
RETURNS TABLE(link_id uuid, title text, month date, clicks int)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT l.id AS link_id,
         l.title,
         date_trunc('month', lc.clicked_at)::date AS month,
         COUNT(*)::int AS clicks
  FROM public.link_clicks lc
  JOIN public.links l ON lc.link_id = l.id
  WHERE l.profile_id = p_profile_id
  GROUP BY l.id, l.title, date_trunc('month', lc.clicked_at)
  ORDER BY month;
$$;

CREATE OR REPLACE FUNCTION public.get_link_stats(
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
         date_trunc('month', lc.clicked_at)::date AS month,
         COUNT(*)::int AS clicks
  FROM public.link_clicks lc
  JOIN public.links l ON lc.link_id = l.id
  WHERE l.profile_id = p_profile_id
    AND (p_link_id IS NULL OR l.id = p_link_id)
    AND (p_search IS NULL OR (l.title ILIKE '%' || p_search || '%' OR l.url ILIKE '%' || p_search || '%'))
    AND (p_start_date IS NULL OR lc.clicked_at >= p_start_date::timestamp)
    AND (p_end_date IS NULL OR lc.clicked_at < (p_end_date::timestamp + INTERVAL '1 day'))
  GROUP BY l.id, l.title, l.url, date_trunc('month', lc.clicked_at)
  ORDER BY month DESC, clicks DESC
  LIMIT COALESCE(p_limit, NULL) OFFSET COALESCE(p_offset, 0);
$$;

CREATE OR REPLACE FUNCTION public.get_link_stats_count(
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
      AND (p_start_date IS NULL OR lc.clicked_at >= p_start_date::timestamp)
      AND (p_end_date IS NULL OR lc.clicked_at < (p_end_date::timestamp + INTERVAL '1 day'))
  ) sub;
$$;

-- 5) Optional: schedule pg_cron job to refresh daily at 00:05 UTC (if pg_cron is available)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    BEGIN
      -- try to create extension (may require elevated privileges)
      PERFORM pg_catalog.create_extension('pg_cron');
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'pg_cron extension create: %', SQLERRM;
    END;

    BEGIN
      -- schedule the refresh (cron.schedule is provided by pg_cron)
      PERFORM cron.schedule('refresh_monthly_link_stats', '5 0 * * *', $$SELECT public.refresh_monthly_link_stats();$$);
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'pg_cron scheduling failed: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'pg_cron not available - please schedule refresh_monthly_link_stats() externally if desired';
  END IF;
END$$;

-- End of migration
