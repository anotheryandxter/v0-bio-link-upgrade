-- ===== REFLECTION PHOTOGRAPHY BIO-LINK DATABASE SCHEMA =====
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (single user: ryandxter)
CREATE TABLE profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE,
  business_name VARCHAR(255) DEFAULT 'Reflection Photography',
  avatar TEXT DEFAULT './assets/avatar.PNG',
  location VARCHAR(255) DEFAULT 'Indonesia',
  page_title VARCHAR(255) DEFAULT 'Reflection Photography',
  background_video JSONB DEFAULT '{"webm":"web.webm","mp4":"web.mp4","ogv":"web.ogv","poster":"img/videoframe.jpg"}',
  -- theme preference removed; app enforces a single light theme at the UI layer
  -- (column removed via migration scripts/009_remove_theme_preference.sql)
  
  is_setup BOOLEAN DEFAULT false,
  is_setup BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Links table with monochrome theme support
CREATE TABLE links (
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

-- Analytics table for tracking link clicks
CREATE TABLE link_clicks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  link_id UUID REFERENCES links(id) ON DELETE CASCADE,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_agent TEXT,
  referrer TEXT,
  ip_address INET
);

-- Create indexes for better performance
CREATE INDEX idx_links_profile_id ON links(profile_id);
CREATE INDEX idx_links_order_index ON links(order_index);
CREATE INDEX idx_links_category ON links(category);
CREATE INDEX idx_link_clicks_link_id ON link_clicks(link_id);
CREATE INDEX idx_link_clicks_clicked_at ON link_clicks(clicked_at);

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add update triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_links_updated_at BEFORE UPDATE ON links
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
