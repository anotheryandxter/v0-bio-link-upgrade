-- Add structured location fields to links so we can store place_id and coordinates
ALTER TABLE links
  ADD COLUMN IF NOT EXISTS place_id TEXT,
  ADD COLUMN IF NOT EXISTS lat NUMERIC,
  ADD COLUMN IF NOT EXISTS lng NUMERIC;

-- Populate from existing urls where possible
-- Extract Google Maps destination_place_id if present (percent-encoded left as-is)
UPDATE links
SET place_id = substring(url from 'destination_place_id=([^&]+)')
WHERE url ~ 'destination_place_id=';

-- Extract coordinates encoded as destination=lat,lng
UPDATE links
SET lat = substring(url from 'destination=([-0-9.]+),')::numeric,
    lng = substring(url from 'destination=[-0-9.]+,([-0-9.]+)')::numeric
WHERE url ~ 'destination=';

-- Indexes to support lookups by coordinates
CREATE INDEX IF NOT EXISTS idx_links_lat ON links(lat);
CREATE INDEX IF NOT EXISTS idx_links_lng ON links(lng);
CREATE INDEX IF NOT EXISTS idx_links_place_id ON links(place_id);
