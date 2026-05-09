-- ============================================================
-- EAS Arena CR Edit Audit System — Database Migration
-- Run this once against your PostgreSQL database after 003.
-- The table is also auto-created on first API call via
-- ensureCRAuditTable() in lib/premium.ts.
-- ============================================================

CREATE TABLE IF NOT EXISTS cr_edit_audit (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     VARCHAR(32) NOT NULL,             -- Discord ID of the player whose CR changed
  player_id   VARCHAR(32) NOT NULL,             -- Discord ID of the player (same as user_id for single edits)
  old_cr      INT         NOT NULL,
  new_cr      INT         NOT NULL,
  reason      TEXT,
  edited_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
  edited_by   VARCHAR(32) NOT NULL,             -- Discord ID of the admin who made the change
  reversible  BOOLEAN     NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_cr_audit_player_id  ON cr_edit_audit(player_id);
CREATE INDEX IF NOT EXISTS idx_cr_audit_edited_by  ON cr_edit_audit(edited_by);
CREATE INDEX IF NOT EXISTS idx_cr_audit_edited_at  ON cr_edit_audit(edited_at DESC);
