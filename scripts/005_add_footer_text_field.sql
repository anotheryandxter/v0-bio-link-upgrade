-- Adding footer_text column to profiles table
ALTER TABLE profiles 
ADD COLUMN footer_text TEXT;

-- Update existing profiles with default footer text
UPDATE profiles 
SET footer_text = '© ' || EXTRACT(YEAR FROM NOW()) || ' ' || business_name
WHERE footer_text IS NULL;
