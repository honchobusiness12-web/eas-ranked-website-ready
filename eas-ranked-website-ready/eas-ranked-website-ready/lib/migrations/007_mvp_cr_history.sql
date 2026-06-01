-- ============================================================
-- EAS Arena — MVP & CR History Migration
-- Run this once against your PostgreSQL database after 006.
-- ============================================================

-- ---------------------------------------------------------------------------
-- mvp_history — tracks every MVP award per match
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mvp_history (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     VARCHAR(32)  NOT NULL,
  match_id    VARCHAR(64)  NOT NULL,
  season_id   UUID         NOT NULL,
  awarded_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mvp_history_user_id    ON mvp_history(user_id);
CREATE INDEX IF NOT EXISTS idx_mvp_history_match_id   ON mvp_history(match_id);
CREATE INDEX IF NOT EXISTS idx_mvp_history_season_id  ON mvp_history(season_id);
CREATE INDEX IF NOT EXISTS idx_mvp_history_awarded_at ON mvp_history(awarded_at DESC);

-- ---------------------------------------------------------------------------
-- cr_history — tracks every CR change per match
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cr_history (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      VARCHAR(32)  NOT NULL,
  old_cr       INTEGER      NOT NULL DEFAULT 0,
  new_cr       INTEGER      NOT NULL DEFAULT 0,
  change       INTEGER      NOT NULL DEFAULT 0,
  match_id     VARCHAR(64)  NOT NULL,
  season_id    UUID         NOT NULL,
  recorded_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cr_history_user_id     ON cr_history(user_id);
CREATE INDEX IF NOT EXISTS idx_cr_history_match_id    ON cr_history(match_id);
CREATE INDEX IF NOT EXISTS idx_cr_history_season_id   ON cr_history(season_id);
CREATE INDEX IF NOT EXISTS idx_cr_history_recorded_at ON cr_history(recorded_at DESC);
