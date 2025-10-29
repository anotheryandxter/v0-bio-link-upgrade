-- Add user_identifier for deduping and create helper functions for analytics

ALTER TABLE link_clicks
  ADD COLUMN IF NOT EXISTS user_identifier TEXT;

CREATE INDEX IF NOT EXISTS idx_link_clicks_user_identifier ON link_clicks(user_identifier);

-- Insert a click only if there isn't a click from the same user_identifier for the same link in the last 24 hours
CREATE OR REPLACE FUNCTION public.insert_click_if_not_exists(
  p_link_id uuid,
  p_user_identifier text,
  p_user_agent text,
  p_referrer text,
  p_ip inet
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM link_clicks
    WHERE link_id = p_link_id
      AND (user_identifier IS NOT DISTINCT FROM p_user_identifier)
      AND clicked_at >= NOW() - INTERVAL '24 hours'
  ) THEN
    INSERT INTO link_clicks (link_id, user_agent, referrer, ip_address, user_identifier)
    VALUES (p_link_id, p_user_agent, p_referrer, p_ip, p_user_identifier);
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Returns monthly aggregated click counts for a given profile
CREATE OR REPLACE FUNCTION public.get_monthly_stats(p_profile_id uuid)
RETURNS TABLE(link_id uuid, title text, month date, clicks int)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT l.id AS link_id,
         l.title,
         date_trunc('month', lc.clicked_at)::date AS month,
         COUNT(*)::int AS clicks
  FROM link_clicks lc
  JOIN links l ON lc.link_id = l.id
  WHERE l.profile_id = p_profile_id
  GROUP BY l.id, l.title, date_trunc('month', lc.clicked_at)
  ORDER BY month;
$$;
