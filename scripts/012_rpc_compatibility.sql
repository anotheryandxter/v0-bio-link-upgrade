-- Compatibility migration: ensure both profile-aware and profile-agnostic
-- get_link_stats and get_link_stats_count RPCs exist so PostgREST
-- callers with either signature work across environments.

-- Profile-aware version: includes p_profile_id as first parameter
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

-- Profile-agnostic versions: same names but without profile arg
CREATE OR REPLACE FUNCTION public.get_link_stats(
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
  WHERE (p_link_id IS NULL OR l.id = p_link_id)
    AND (p_search IS NULL OR (l.title ILIKE '%' || p_search || '%' OR l.url ILIKE '%' || p_search || '%'))
    AND (p_start_date IS NULL OR lc.clicked_at >= p_start_date::timestamp)
    AND (p_end_date IS NULL OR lc.clicked_at < (p_end_date::timestamp + INTERVAL '1 day'))
  GROUP BY l.id, l.title, l.url, date_trunc('month', lc.clicked_at)
  ORDER BY month DESC, clicks DESC
  LIMIT COALESCE(p_limit, NULL) OFFSET COALESCE(p_offset, 0);
$$;

CREATE OR REPLACE FUNCTION public.get_link_stats_count(
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
  WHERE (p_link_id IS NULL OR l.id = p_link_id)
      AND (p_search IS NULL OR (l.title ILIKE '%' || p_search || '%' OR l.url ILIKE '%' || p_search || '%'))
      AND (p_start_date IS NULL OR lc.clicked_at >= p_start_date::timestamp)
      AND (p_end_date IS NULL OR lc.clicked_at < (p_end_date::timestamp + INTERVAL '1 day'))
  ) sub;
$$;

-- Ensure helpful indexes exist (idempotent)
CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at ON public.link_clicks (clicked_at);
CREATE INDEX IF NOT EXISTS idx_link_clicks_link_clicked_at ON public.link_clicks (link_id, clicked_at);

-- Materialized view helper indexes (no-op if already present)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'monthly_link_stats') THEN
    CREATE INDEX IF NOT EXISTS idx_monthly_link_stats_link_month ON public.monthly_link_stats (link_id, month);
    CREATE INDEX IF NOT EXISTS idx_monthly_link_stats_profile_month ON public.monthly_link_stats (profile_id, month);
  END IF;
END$$;
