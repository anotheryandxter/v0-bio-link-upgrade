-- Migration: add embed_slug column and unique index
-- Run this against your database (psql or via migration tooling).

ALTER TABLE links
  ADD COLUMN IF NOT EXISTS embed_slug text;

-- Create unique index on lower(embed_slug) to ensure case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS links_embed_slug_unique ON links ((lower(embed_slug))) WHERE embed_slug IS NOT NULL;

-- Optionally, trim whitespace on existing values (run separately if needed):
-- UPDATE links SET embed_slug = trim(embed_slug) WHERE embed_slug IS NOT NULL;
