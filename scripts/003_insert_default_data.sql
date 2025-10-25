-- ===== INSERT DEFAULT DATA FOR REFLECTION PHOTOGRAPHY =====
-- Note: This script assumes the user 'ryandxter' has been created in auth.users
-- The user_id will need to be updated with the actual UUID after user creation

-- Insert default profile (will be updated with actual user_id after auth setup)
INSERT INTO profiles (
  user_id, 
  business_name, 
  avatar, 
  location, 
  page_title, 
  background_video,
  is_setup
) VALUES (
  '00000000-0000-0000-0000-000000000000', -- Placeholder - update with actual user_id
  'Reflection Photography',
  './assets/avatar.PNG',
  'Indonesia',
  'Reflection Photography',
  '{"webm":"web.webm","mp4":"web.mp4","ogv":"web.ogv","poster":"img/videoframe.jpg"}',
  true
) ON CONFLICT (user_id) DO UPDATE SET
  business_name = EXCLUDED.business_name,
  avatar = EXCLUDED.avatar,
  location = EXCLUDED.location,
  page_title = EXCLUDED.page_title,
  background_video = EXCLUDED.background_video,
  is_setup = EXCLUDED.is_setup,
  updated_at = NOW();

-- Insert default links from existing static site
-- Get the profile_id for the links (assuming single profile)
DO $$
DECLARE
    profile_uuid UUID;
BEGIN
    SELECT id INTO profile_uuid FROM profiles LIMIT 1;
    
    -- Insert main category links
    INSERT INTO links (
      profile_id, title, url, icon, 
      background_color_light, background_color_dark, 
      text_color_light, text_color_dark, 
      opacity, order_index, category
    ) VALUES 
    -- MEMBERSHIP link
    (profile_uuid, 'MEMBERSHIP', 'https://drive.google.com/file/d/1pS9eX3F9YlYLh0fvrI4txWdLD_lagDKV/view?pli=1', 
     'fa fa-info-circle', '#ffd621', '#f59e0b', '#333333', '#1f2937', 0.90, 1, 'main'),
    
    -- WhatsApp CS links
    (profile_uuid, 'CS Yogyakarta', 'https://wa.me/6285602103418', 
     'fab fa-whatsapp', '#29c493', '#10b981', '#ffffff', '#ffffff', 0.85, 2, 'main'),
    
    (profile_uuid, 'CS Semarang', 'https://wa.me/628112933418', 
     'fab fa-whatsapp', '#29c493', '#10b981', '#ffffff', '#ffffff', 0.85, 3, 'main'),
    
    (profile_uuid, 'CS Solo', 'https://wa.me/628159993418', 
     'fab fa-whatsapp', '#29c493', '#10b981', '#ffffff', '#ffffff', 0.85, 4, 'main'),
    
    -- Service links with monochrome theme
    (profile_uuid, 'Wedding & Event', 'https://wa.me/6281326008449', 
     'fa-solid fa-rings-wedding', '#e5e5e5', '#525252', '#171717', '#fafafa', 0.80, 5, 'main'),
    
    (profile_uuid, 'Product & Catalog', 'https://www.instagram.com/reflectionphotography_product/', 
     'fa-solid fa-box-circle-check', '#e5e5e5', '#525252', '#171717', '#fafafa', 0.80, 6, 'main'),
    
    (profile_uuid, 'Partnership', 'https://maps.app.goo.gl/RxJB6WmUhxnkziWbA', 
     'fa-solid fa-users', '#333333', '#404040', '#ffffff', '#fafafa', 0.75, 7, 'main')
    
    ON CONFLICT DO NOTHING;
    
END $$;

-- Create a function to update profile with actual user_id after auth
CREATE OR REPLACE FUNCTION update_profile_user_id(actual_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles 
    SET user_id = actual_user_id, updated_at = NOW()
    WHERE user_id = '00000000-0000-0000-0000-000000000000';
END;
$$ LANGUAGE plpgsql;

-- Instructions for after user creation:
-- SELECT update_profile_user_id('actual-user-uuid-here');
