-- Migration 008: Avatar columns
--
-- Adds dedicated top-level columns for avatar data alongside the existing
-- JSONB `data` column.  The application already reads/writes avatar_url
-- inside the JSONB blob; these columns provide:
--   • avatar_hash        — raw Discord hash for URL rebuilding
--   • avatar_updated_at  — timestamp for cache invalidation / refresh logic
--
-- The avatar_url column is kept inside the JSONB data blob for backwards
-- compatibility with the existing queries.  These new columns are optional
-- extras — the app works without them.

-- Add avatar_hash column (stores the raw Discord hash, e.g. "a_abc123")
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS avatar_hash TEXT;

-- Add avatar_updated_at column (timestamp of last avatar sync)
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS avatar_updated_at TIMESTAMPTZ;

-- Index for efficient "find players whose avatar hasn't been refreshed recently"
CREATE INDEX IF NOT EXISTS idx_players_avatar_updated_at
  ON players (avatar_updated_at);

-- Backfill avatar_hash from the existing JSONB data where possible.
-- The hash is the last path segment of the avatar_url before the extension.
UPDATE players
SET
  avatar_hash = (
    regexp_match(data->>'avatar_url', '/avatars/\d+/([^.?]+)') 
  )[1],
  avatar_updated_at = NOW()
WHERE
  data->>'avatar_url' IS NOT NULL
  AND avatar_hash IS NULL;
