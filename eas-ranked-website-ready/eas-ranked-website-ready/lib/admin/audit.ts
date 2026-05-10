import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Admin Audit Log
// ---------------------------------------------------------------------------
// Every admin action is recorded here: who did what, to whom, and when.
// The table is created on first use — no separate migration required.
// ---------------------------------------------------------------------------

export type AuditAction =
  | "assign_badge"
  | "remove_badge"
  | "grant_premium"
  | "revoke_premium"
  | "update_player_stats"
  | "reset_all_stats";

export interface AuditEntry {
  id: string;
  admin_id: string;
  action: AuditAction;
  user_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

/** Ensure the admin_audit_log table exists. Called lazily before each write. */
async function ensureAuditTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id   VARCHAR(32) NOT NULL,
      action     VARCHAR(64) NOT NULL,
      user_id    VARCHAR(32),
      details    JSONB       NOT NULL DEFAULT '{}',
      created_at TIMESTAMP   NOT NULL DEFAULT NOW()
    )
  `);

  // Indexes for fast lookups by admin, target user, and time
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id   ON admin_audit_log(admin_id);
    CREATE INDEX IF NOT EXISTS idx_admin_audit_log_user_id    ON admin_audit_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
  `);
}

/**
 * Write a single audit log entry.
 *
 * @param adminId  Discord user ID of the admin performing the action
 * @param action   One of the AuditAction string literals
 * @param userId   Discord user ID of the player being acted on (null for bulk ops)
 * @param details  Arbitrary JSON payload — badge IDs, stat values, etc.
 */
export async function logAudit(
  adminId: string,
  action: AuditAction,
  userId: string | null,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    await ensureAuditTable();
    await pool.query(
      `INSERT INTO admin_audit_log (admin_id, action, user_id, details)
       VALUES ($1, $2, $3, $4)`,
      [adminId, action, userId, JSON.stringify(details)]
    );
  } catch (err) {
    // Audit failures must never crash the primary action — log and continue.
    console.error("[audit] logAudit failed:", err);
  }
}
