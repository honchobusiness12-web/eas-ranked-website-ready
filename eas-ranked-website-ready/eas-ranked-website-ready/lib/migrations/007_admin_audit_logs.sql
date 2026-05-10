-- ============================================================
-- EAS Arena — Admin Audit Logs Migration
-- Run this once against your PostgreSQL database after 006.
-- ============================================================

-- ---------------------------------------------------------------------------
-- admin_audit_logs — immutable record of every admin action
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       VARCHAR(32) NOT NULL,             -- Discord user ID of the admin
  action         VARCHAR(64) NOT NULL,             -- e.g. "assign_badge", "grant_premium"
  target_user_id VARCHAR(32),                      -- Discord user ID of the affected player
  details        JSONB       NOT NULL DEFAULT '{}',-- Action-specific metadata
  created_at     TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin_id       ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_user_id ON admin_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at     ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action         ON admin_audit_logs(action);
