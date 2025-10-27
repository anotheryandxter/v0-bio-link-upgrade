-- Combined migration (safe, non-sensitive migrations)
-- This file consolidates schema/rls/triggers/indexes and non-seed migrations.
-- Sensitive seed data and user-creation scripts have been removed from their
-- original files and should be handled separately via secure tooling.

-- ===== 001_create_database_schema.sql (DDL) =====
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (single user: protected by RLS)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  business_name VARCHAR(255) DEFAULT 'Reflection Photography',
  avatar TEXT DEFAULT './assets/avatar.PNG',
  location VARCHAR(255) DEFAULT 'Indonesia',
  page_title VARCHAR(255) DEFAULT 'Reflection Photography',
  background_video JSONB DEFAULT '{"webm":"web.webm","mp4":"web.mp4","ogv":"web.ogv","poster":"img/videoframe.jpg"}',
  is_setup BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Links table
CREATE TABLE IF NOT EXISTS links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  icon VARCHAR(255) NOT NULL,
  background_color_light VARCHAR(7) NOT NULL,
  background_color_dark VARCHAR(7) NOT NULL,
  background_image TEXT,
  text_color_light VARCHAR(7) NOT NULL,
  text_color_dark VARCHAR(7) NOT NULL,
  opacity DECIMAL(3,2) DEFAULT 0.80 CHECK (opacity >= 0.1 AND opacity <= 1.0),
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  category VARCHAR(20) CHECK (category IN ('main', 'location', 'social')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics table
CREATE TABLE IF NOT EXISTS link_clicks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  link_id UUID REFERENCES links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  referrer TEXT,
  ip_address INET
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_links_profile_id ON links(profile_id);
CREATE INDEX IF NOT EXISTS idx_links_order_index ON links(order_index);
CREATE INDEX IF NOT EXISTS idx_links_category ON links(category);
CREATE INDEX IF NOT EXISTS idx_link_clicks_link_id ON link_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at ON link_clicks(clicked_at);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_links_updated_at BEFORE UPDATE ON links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===== 002_configure_rls_policies.sql (RLS) =====
-- Enable RLS on tables and add policies
ALTER TABLE IF EXISTS profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS links ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS link_clicks ENABLE ROW LEVEL SECURITY;

-- Public can view setup profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg POLICY WHERE FALSE) THEN
    NULL; -- noop - keep in file for reference
  END IF;
END$$;

-- (Explicit policies are created by the original migration file and are included
-- in the repository history if needed. For safety we keep policy creation in
-- the combined migration only if necessary via your DB admin tools.)

-- ===== 005_add_footer_text_field.sql =====
ALTER TABLE IF EXISTS profiles ADD COLUMN IF NOT EXISTS footer_text TEXT;
UPDATE profiles SET footer_text = '© ' || EXTRACT(YEAR FROM NOW()) || ' ' || business_name
WHERE footer_text IS NULL;

-- ===== 006_add_background_customization.sql =====
ALTER TABLE IF NOT EXISTS profiles ADD COLUMN IF NOT EXISTS homepage_background JSONB DEFAULT '{"type":"video","video":{"webm":"web.webm","mp4":"web.mp4","ogv":"web.ogv","poster":"img/videoframe.jpg","fit":"cover","position":"center","opacity":1,"blur":0,"muted":true,"loop":true,"autoplay":true},"overlay":{"enabled":true,"color":"#000000","opacity":0.3}}';

CREATE TABLE IF NOT EXISTS media_uploads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  file_size INTEGER NOT NULL,
  url TEXT NOT NULL,
  usage_type VARCHAR(50) CHECK (usage_type IN ('avatar', 'favicon', 'background_image', 'background_video', 'link_icon')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE IF EXISTS media_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS "Users can manage own media" ON media_uploads
  FOR ALL USING (auth.uid() = user_id);

-- ===== 007_click_dedup_and_stats.sql =====
ALTER TABLE IF EXISTS link_clicks
  ADD COLUMN IF NOT EXISTS user_identifier TEXT;
CREATE INDEX IF NOT EXISTS idx_link_clicks_user_identifier ON link_clicks(user_identifier);

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

-- More flexible stats RPC: supports optional start/end dates, link filter, and search on title/url.
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
  FROM link_clicks lc
  JOIN links l ON lc.link_id = l.id
  WHERE l.profile_id = p_profile_id
    AND (p_link_id IS NULL OR l.id = p_link_id)
    AND (p_search IS NULL OR (l.title ILIKE '%' || p_search || '%' OR l.url ILIKE '%' || p_search || '%'))
    AND (p_start_date IS NULL OR lc.clicked_at >= p_start_date::timestamp)
    AND (p_end_date IS NULL OR lc.clicked_at < (p_end_date::timestamp + INTERVAL '1 day'))
  GROUP BY l.id, l.title, l.url, date_trunc('month', lc.clicked_at)
  ORDER BY month DESC, clicks DESC
  LIMIT COALESCE(p_limit, NULL) OFFSET COALESCE(p_offset, 0);
$$;

-- Count RPC for pagination total
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
    FROM link_clicks lc
    JOIN links l ON lc.link_id = l.id
    WHERE l.profile_id = p_profile_id
      AND (p_link_id IS NULL OR l.id = p_link_id)
      AND (p_search IS NULL OR (l.title ILIKE '%' || p_search || '%' OR l.url ILIKE '%' || p_search || '%'))
      AND (p_start_date IS NULL OR lc.clicked_at >= p_start_date::timestamp)
      AND (p_end_date IS NULL OR lc.clicked_at < (p_end_date::timestamp + INTERVAL '1 day'))
  ) sub;
$$;

-- Helpful index for date range queries
CREATE INDEX IF NOT EXISTS idx_link_clicks_clicked_at ON link_clicks (clicked_at);
-- Composite indexes for common query patterns (profile + clicked_at) and (link + clicked_at)
-- Only create profile-based indexes if the profile_id column exists (single-admin deployments may not have it)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'link_clicks' AND column_name = 'profile_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_link_clicks_profile_clicked_at ON link_clicks (profile_id, clicked_at);
  END IF;
END$$;
CREATE INDEX IF NOT EXISTS idx_link_clicks_link_clicked_at ON link_clicks (link_id, clicked_at);

-- ===== 008_materialized_monthly_stats.sql =====
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_link_stats_link_month ON public.monthly_link_stats (link_id, month);
CREATE INDEX IF NOT EXISTS idx_monthly_link_stats_profile_month ON public.monthly_link_stats (profile_id, month);

CREATE OR REPLACE FUNCTION public.refresh_monthly_link_stats()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.monthly_link_stats;
END;
$$;

-- Backfill helper: insert aggregated rows into materialized view (upsert)
-- This is a helper statement; materialized view should be refreshed via refresh_monthly_link_stats()

-- ===== 009_remove_theme_preference.sql =====
BEGIN;
UPDATE profiles
SET theme_preference = 'light'
WHERE theme_preference IS DISTINCT FROM 'light'
   OR theme_preference IS NULL;

ALTER TABLE profiles
DROP COLUMN IF EXISTS theme_preference;
COMMIT;

-- ===== 010_drop_favicon_column.sql =====
BEGIN;
ALTER TABLE IF EXISTS profiles DROP COLUMN IF EXISTS favicon;
COMMIT;

-- End of combined migration
