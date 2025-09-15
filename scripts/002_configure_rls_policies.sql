-- ===== ROW LEVEL SECURITY POLICIES =====
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE link_clicks ENABLE ROW LEVEL SECURITY;

-- ===== PROFILES TABLE POLICIES =====
-- Public can view setup profiles (for bio page display)
CREATE POLICY "Public can view setup profile" ON profiles
  FOR SELECT USING (is_setup = true);

-- Owner can manage their own profile
CREATE POLICY "Owner can manage profile" ON profiles
  FOR ALL USING (auth.uid() = user_id);

-- ===== LINKS TABLE POLICIES =====
-- Public can view active links (for bio page display)
CREATE POLICY "Public can view active links" ON links
  FOR SELECT USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = links.profile_id 
      AND profiles.is_setup = true
    )
  );

-- Owner can manage their own links
CREATE POLICY "Owner can manage links" ON links
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = links.profile_id 
    AND profiles.user_id = auth.uid()
  ));

-- ===== LINK_CLICKS TABLE POLICIES =====
-- Anyone can insert clicks (for analytics tracking)
CREATE POLICY "Anyone can insert clicks" ON link_clicks
  FOR INSERT WITH CHECK (true);

-- Owner can view their own analytics
CREATE POLICY "Owner can view analytics" ON link_clicks
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM links 
    JOIN profiles ON links.profile_id = profiles.id
    WHERE links.id = link_clicks.link_id 
    AND profiles.user_id = auth.uid()
  ));

-- Owner can delete their own analytics data
CREATE POLICY "Owner can delete analytics" ON link_clicks
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM links 
    JOIN profiles ON links.profile_id = profiles.id
    WHERE links.id = link_clicks.link_id 
    AND profiles.user_id = auth.uid()
  ));
