-- ============================================================
-- EAS Arena Audit Log System — Database Migration
-- Run this once against your PostgreSQL database after 003.
-- Tracks all player data changes for safety and recovery.
-- ============================================================

CREATE TABLE IF NOT EXISTS player_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     VARCHAR(32) NOT NULL,               -- Discord user ID of the affected player
  old_cr      INT,                                -- CR before the change (nullable)
  new_cr      INT,                                -- CR after the change (nullable)
  old_data    JSONB,                              -- Full player row before change
  new_data    JSONB,                              -- Full player row after change
  changed_by  VARCHAR(32) NOT NULL,               -- Discord user ID of the admin who made the change
  reason      TEXT        NOT NULL,               -- Required reason for the change
  changed_at  TIMESTAMP   NOT NULL DEFAULT NOW(), -- When the change was applied
  created_at  TIMESTAMP   NOT NULL DEFAULT NOW()  -- When this log entry was created
);

CREATE INDEX IF NOT EXISTS idx_audit_user_id    ON player_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_changed_by ON player_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at ON player_audit_log(changed_at DESC);
