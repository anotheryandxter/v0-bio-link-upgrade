-- Add homepage background configuration to profiles table
ALTER TABLE profiles ADD COLUMN homepage_background JSONB DEFAULT '{
  "type": "video",
  "video": {
    "webm": "web.webm",
    "mp4": "web.mp4", 
    "ogv": "web.ogv",
    "poster": "img/videoframe.jpg",
    "fit": "cover",
    "position": "center",
    "opacity": 1,
    "blur": 0,
    "muted": true,
    "loop": true,
    "autoplay": true
  },
  "overlay": {
    "enabled": true,
    "color": "#000000",
    "opacity": 0.3
  }
}';

-- Create media uploads table for custom backgrounds
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

-- RLS for media uploads
ALTER TABLE media_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own media" ON media_uploads
  FOR ALL USING (auth.uid() = user_id);

-- Update existing profiles to use new background format
UPDATE profiles SET homepage_background = jsonb_build_object(
  'type', 'video',
  'video', COALESCE(background_video, '{
    "webm": "web.webm",
    "mp4": "web.mp4", 
    "ogv": "web.ogv",
    "poster": "img/videoframe.jpg",
    "fit": "cover",
    "position": "center",
    "opacity": 1,
    "blur": 0,
    "muted": true,
    "loop": true,
    "autoplay": true
  }'::jsonb),
  'overlay', '{
    "enabled": true,
    "color": "#000000",
    "opacity": 0.3
  }'::jsonb
) WHERE homepage_background IS NULL;
