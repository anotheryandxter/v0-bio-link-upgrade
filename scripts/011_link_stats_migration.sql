-- Focused migration: add link stats RPCs and indexes
-- Run this in Supabase SQL editor or via your migration tooling to apply only the analytics additions.

-- get_link_stats: paginated, supports date range, link filter, and search
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

-- Count RPC for pagination totals (profile-agnostic)
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

-- Indexes to speed up common patterns
CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at ON public.link_clicks (clicked_at);
CREATE INDEX IF NOT EXISTS idx_link_clicks_link_clicked_at ON public.link_clicks (link_id, clicked_at);

-- NOTE: This migration only adds functions and indexes. RLS policies are unchanged and should keep
-- analytics reads restricted to profile owners / admin sessions.
