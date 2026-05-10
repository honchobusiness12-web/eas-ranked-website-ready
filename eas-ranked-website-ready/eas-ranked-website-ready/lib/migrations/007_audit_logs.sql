-- ============================================================
-- EAS Arena Admin Audit Log System — Database Migration 007
-- Run once against your PostgreSQL database after 006.
-- Tracks every admin action with before/after values.
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action      VARCHAR(64) NOT NULL,              -- e.g. 'assign_badge', 'grant_premium', 'reset_stats'
  user_id     VARCHAR(32) NOT NULL,              -- Discord user ID of the player affected
  admin_id    VARCHAR(32) NOT NULL,              -- Discord user ID of the admin who performed the action
  changes     JSONB       NOT NULL DEFAULT '{}', -- { before: {...}, after: {...} }
  created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id   ON audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
