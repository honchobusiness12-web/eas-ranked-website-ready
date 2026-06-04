-- ============================================================
-- EAS Arena — Legacy Badge Cleanup Migration
-- Run this once after 008_badge_system.sql.
-- Removes contentCreator, tournamentWinner, and staff entries
-- from the legacy players.data->'badges' JSON array for all
-- players, and writes an audit log entry for each removal.
-- Rank badges (R6 SuperStar Low, Ranked, etc.) are NOT stored
-- in this array and are completely unaffected.
-- ============================================================

-- ---------------------------------------------------------------------------
-- Step 1: Log removals BEFORE we delete them so we capture who had what.
-- ---------------------------------------------------------------------------

-- Log contentCreator removals
INSERT INTO badge_audit_log (guild_id, user_id, badge_id, action, performed_by, reason, created_at)
SELECT
  1467697766837915804,
  user_id::VARCHAR(32),
  'contentCreator',
  'remove',
  '0',
  'System cleanup - legacy badge removal (migration 009)',
  NOW()
FROM players
WHERE data->'badges' @> '"contentCreator"'::jsonb;

-- Log tournamentWinner removals
INSERT INTO badge_audit_log (guild_id, user_id, badge_id, action, performed_by, reason, created_at)
SELECT
  1467697766837915804,
  user_id::VARCHAR(32),
  'tournamentWinner',
  'remove',
  '0',
  'System cleanup - legacy badge removal (migration 009)',
  NOW()
FROM players
WHERE data->'badges' @> '"tournamentWinner"'::jsonb;

-- Log staff removals
INSERT INTO badge_audit_log (guild_id, user_id, badge_id, action, performed_by, reason, created_at)
SELECT
  1467697766837915804,
  user_id::VARCHAR(32),
  'staff',
  'remove',
  '0',
  'System cleanup - legacy badge removal (migration 009)',
  NOW()
FROM players
WHERE data->'badges' @> '"staff"'::jsonb;

-- ---------------------------------------------------------------------------
-- Step 2: Remove legacy badge IDs from players.data->'badges' for all users.
-- ---------------------------------------------------------------------------

UPDATE players
SET data = jsonb_set(
  COALESCE(data, '{}'),
  '{badges}',
  (
    SELECT COALESCE(jsonb_agg(b), '[]'::jsonb)
    FROM jsonb_array_elements_text(COALESCE(data->'badges', '[]'::jsonb)) AS b
    WHERE b NOT IN ('contentCreator', 'tournamentWinner', 'staff')
  )
)
WHERE data->'badges' IS NOT NULL
  AND (
    data->'badges' @> '"contentCreator"'::jsonb
    OR data->'badges' @> '"tournamentWinner"'::jsonb
    OR data->'badges' @> '"staff"'::jsonb
  );

-- ---------------------------------------------------------------------------
-- Step 3: Verify — this query should return 0 rows after the migration.
-- ---------------------------------------------------------------------------

-- SELECT user_id, data->'badges' AS badges
-- FROM players
-- WHERE data->'badges' @> '"contentCreator"'::jsonb
--    OR data->'badges' @> '"tournamentWinner"'::jsonb
--    OR data->'badges' @> '"staff"'::jsonb;
