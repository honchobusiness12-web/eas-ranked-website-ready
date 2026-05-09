import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuditLogEntry {
  id: string;
  user_id: string;
  old_cr: number | null;
  new_cr: number | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  changed_by: string;
  reason: string;
  changed_at: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Table initialisation
// ---------------------------------------------------------------------------

export async function ensureAuditTable(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS player_audit_log (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     VARCHAR(32) NOT NULL,
        old_cr      INT,
        new_cr      INT,
        old_data    JSONB,
        new_data    JSONB,
        changed_by  VARCHAR(32) NOT NULL,
        reason      TEXT        NOT NULL,
        changed_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
        created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_user_id    ON player_audit_log(user_id)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_changed_by ON player_audit_log(changed_by)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_audit_changed_at ON player_audit_log(changed_at DESC)`
    );
  } catch (err) {
    console.error("[audit] ensureAuditTable failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Core logging function
// ---------------------------------------------------------------------------

/**
 * Log a player data change to the audit table.
 *
 * @param userId    - Discord user ID of the player being changed
 * @param oldData   - Full player row before the change (null for INSERT)
 * @param newData   - Full player row after the change (null for DELETE)
 * @param changedBy - Discord user ID of the admin performing the change
 * @param reason    - Human-readable reason for the change (required)
 */
export async function logPlayerChange(
  userId: string,
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
  changedBy: string,
  reason: string
): Promise<AuditLogEntry | null> {
  try {
    await ensureAuditTable();

    const oldCr =
      oldData && typeof oldData.cr === "number"
        ? oldData.cr
        : oldData && oldData.data && typeof (oldData.data as Record<string, unknown>).cr === "number"
        ? ((oldData.data as Record<string, unknown>).cr as number)
        : null;

    const newCr =
      newData && typeof newData.cr === "number"
        ? newData.cr
        : newData && newData.data && typeof (newData.data as Record<string, unknown>).cr === "number"
        ? ((newData.data as Record<string, unknown>).cr as number)
        : null;

    const result = await pool.query(
      `
      INSERT INTO player_audit_log
        (user_id, old_cr, new_cr, old_data, new_data, changed_by, reason)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        userId,
        oldCr,
        newCr,
        oldData ? JSON.stringify(oldData) : null,
        newData ? JSON.stringify(newData) : null,
        changedBy,
        reason,
      ]
    );

    return result.rows[0] as AuditLogEntry;
  } catch (err) {
    console.error(`[audit] logPlayerChange(${userId}) failed:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

/**
 * Return the audit history for a single player, newest first.
 */
export async function getPlayerAuditHistory(
  userId: string,
  limit = 50
): Promise<AuditLogEntry[]> {
  try {
    await ensureAuditTable();
    const result = await pool.query(
      `
      SELECT * FROM player_audit_log
      WHERE user_id = $1
      ORDER BY changed_at DESC
      LIMIT $2
      `,
      [userId, limit]
    );
    return result.rows as AuditLogEntry[];
  } catch (err) {
    console.error(`[audit] getPlayerAuditHistory(${userId}) failed:`, err);
    return [];
  }
}

/**
 * Return all changes made in the last N minutes, newest first.
 */
export async function getRecentChanges(minutes = 60): Promise<AuditLogEntry[]> {
  try {
    await ensureAuditTable();
    const result = await pool.query(
      `
      SELECT * FROM player_audit_log
      WHERE changed_at >= NOW() - ($1 || ' minutes')::interval
      ORDER BY changed_at DESC
      LIMIT 500
      `,
      [minutes]
    );
    return result.rows as AuditLogEntry[];
  } catch (err) {
    console.error(`[audit] getRecentChanges(${minutes}m) failed:`, err);
    return [];
  }
}
