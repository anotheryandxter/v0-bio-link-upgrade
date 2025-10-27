-- Create a materialized view that pre-aggregates monthly link clicks
-- Includes profile_id so we can filter per-profile efficiently
-- Create materialized view if the schema includes profile_id; otherwise create a simplified view
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'links' AND column_name = 'profile_id'
  ) THEN
    CREATE MATERIALIZED VIEW IF NOT EXISTS public.monthly_link_stats AS
    SELECT
      l.id AS link_id,
      l.profile_id,
      l.title,
      date_trunc('month', lc.clicked_at)::date AS month,
      count(*) AS clicks
    FROM public.link_clicks lc
    JOIN public.links l ON lc.link_id = l.id
    GROUP BY l.id, l.profile_id, l.title, date_trunc('month', lc.clicked_at);

    -- Index to allow fast lookups and allow CONCURRENTLY refresh
    CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_link_stats_link_month ON public.monthly_link_stats (link_id, month);
    CREATE INDEX IF NOT EXISTS idx_monthly_link_stats_profile_month ON public.monthly_link_stats (profile_id, month);
  ELSE
    -- Fallback for single-admin sites without profile_id
    CREATE MATERIALIZED VIEW IF NOT EXISTS public.monthly_link_stats AS
    SELECT
      l.id AS link_id,
      l.title,
      date_trunc('month', lc.clicked_at)::date AS month,
      count(*) AS clicks
    FROM public.link_clicks lc
    JOIN public.links l ON lc.link_id = l.id
    GROUP BY l.id, l.title, date_trunc('month', lc.clicked_at);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_link_stats_link_month ON public.monthly_link_stats (link_id, month);
  END IF;
END$$;

-- Refresh function
CREATE OR REPLACE FUNCTION public.refresh_monthly_link_stats()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Refresh concurrently to avoid blocking reads. Requires unique index above.
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.monthly_link_stats;
END;
$$;

-- Optional: schedule a cron job to refresh daily at 00:05 UTC.
-- Note: The pg_cron extension must be enabled in the database for this to work.
-- If pg_cron is not available, you can schedule refreshes via external cron or Supabase scheduled functions.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    BEGIN
      CREATE EXTENSION IF NOT EXISTS pg_cron;
    EXCEPTION WHEN others THEN
      -- ignore if unable to create extension
      RAISE NOTICE 'pg_cron extension not available: %', SQLERRM;
    END;

    -- schedule to run daily at 00:05
    PERFORM cron.schedule('refresh_monthly_link_stats', '5 0 * * *', $$SELECT public.refresh_monthly_link_stats();$$);
  ELSE
    RAISE NOTICE 'pg_cron not available - please schedule refresh_monthly_link_stats() externally';
  END IF;
END$$;
