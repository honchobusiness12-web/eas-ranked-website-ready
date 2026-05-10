import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Admin Audit Logging
// ---------------------------------------------------------------------------

export type AdminAction =
  | "assign_badge"
  | "remove_badge"
  | "grant_premium"
  | "revoke_premium"
  | "edit_stats"
  | "reset_player"
  | "search_players";

export interface AuditLogEntry {
  adminId: string;
  action: AdminAction;
  targetUserId: string;
  details?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
}

/**
 * Ensures the admin_audit_logs table exists. Called lazily before first write.
 */
async function ensureAuditTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      admin_id       VARCHAR(32) NOT NULL,
      action         VARCHAR(64) NOT NULL,
      target_user_id VARCHAR(32) NOT NULL,
      details        JSONB       NOT NULL DEFAULT '{}',
      success        BOOLEAN     NOT NULL DEFAULT true,
      error_message  TEXT,
      created_at     TIMESTAMP   NOT NULL DEFAULT NOW()
    )
  `);
}

/**
 * Writes a single audit log entry to the database.
 * Failures are logged to console but never thrown — audit logging must not
 * break the primary action.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    await ensureAuditTable();
    await pool.query(
      `INSERT INTO admin_audit_logs
         (admin_id, action, target_user_id, details, success, error_message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        entry.adminId,
        entry.action,
        entry.targetUserId,
        JSON.stringify(entry.details ?? {}),
        entry.success,
        entry.errorMessage ?? null,
      ]
    );
  } catch (err) {
    console.error("[audit] writeAuditLog failed:", err);
  }
}

/**
 * Fetches recent audit log entries, optionally filtered by admin or target user.
 */
export async function getAuditLogs(opts?: {
  adminId?: string;
  targetUserId?: string;
  limit?: number;
  offset?: number;
}): Promise<
  Array<{
    id: string;
    admin_id: string;
    action: string;
    target_user_id: string;
    details: Record<string, unknown>;
    success: boolean;
    error_message: string | null;
    created_at: string;
  }>
> {
  try {
    await ensureAuditTable();

    const conditions: string[] = [];
    const params: unknown[] = [];

    if (opts?.adminId) {
      params.push(opts.adminId);
      conditions.push(`admin_id = $${params.length}`);
    }
    if (opts?.targetUserId) {
      params.push(opts.targetUserId);
      conditions.push(`target_user_id = $${params.length}`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = Math.min(opts?.limit ?? 50, 200);
    const offset = opts?.offset ?? 0;

    params.push(limit, offset);

    const result = await pool.query(
      `SELECT id, admin_id, action, target_user_id, details, success, error_message, created_at
       FROM admin_audit_logs
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return result.rows;
  } catch (err) {
    console.error("[audit] getAuditLogs failed:", err);
    return [];
  }
}
