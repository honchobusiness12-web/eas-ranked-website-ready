import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KillsAuditLog {
  id: string;
  player_id: string;
  player_name: string | null;
  old_kills: number;
  new_kills: number;
  added_kills: number;
  edited_by: string;
  reason: string;
  created_at: string;
}

export interface PlayerKillsInfo {
  user_id: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  kills: number;
}

// ---------------------------------------------------------------------------
// Ensure the audit log table exists (idempotent)
// ---------------------------------------------------------------------------

async function ensureKillsAuditTable(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS kills_audit_logs (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id   VARCHAR(32) NOT NULL,
        old_kills   INT         NOT NULL,
        new_kills   INT         NOT NULL,
        added_kills INT         NOT NULL DEFAULT 0,
        edited_by   VARCHAR(32) NOT NULL,
        reason      TEXT        NOT NULL,
        created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_kills_audit_logs_player_id ON kills_audit_logs(player_id)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_kills_audit_logs_created_at ON kills_audit_logs(created_at DESC)`
    );
  } catch (err) {
    console.error("[kills-admin] ensureKillsAuditTable failed:", err);
  }
}

// ---------------------------------------------------------------------------
// validateKillsValue — kills must be a non-negative integer ≤ 99999
// ---------------------------------------------------------------------------

export function validateKillsValue(kills: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(kills)) {
    return { valid: false, error: "Kills must be a whole number." };
  }
  if (kills < 0) {
    return { valid: false, error: "Kills cannot be negative." };
  }
  if (kills > 99999) {
    return { valid: false, error: "Kills cannot exceed 99999." };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// getPlayerKillsInfo — look up a single player by Discord user ID
// ---------------------------------------------------------------------------

export async function getPlayerKillsInfo(playerId: string): Promise<PlayerKillsInfo | null> {
  const result = await pool.query<PlayerKillsInfo>(
    `
    SELECT
      user_id,
      COALESCE(data->>'display_name', data->>'username', 'Unknown Player') AS name,
      data->>'username' AS username,
      data->>'avatar_url' AS avatar_url,
      COALESCE((data->>'kills')::int, 0) AS kills
    FROM players
    WHERE user_id = $1
    LIMIT 1
    `,
    [playerId]
  );

  return result.rows[0] ?? null;
}

// ---------------------------------------------------------------------------
// updatePlayerKills — set a player's kills to a specific value with audit log
// This is the sanctioned path for admin direct-set edits.
// ---------------------------------------------------------------------------

export async function updatePlayerKills(
  playerId: string,
  newKills: number,
  editedBy: string,
  reason: string
): Promise<{ success: true; oldKills: number } | { success: false; error: string }> {
  await ensureKillsAuditTable();

  const validation = validateKillsValue(newKills);
  if (!validation.valid) {
    return { success: false, error: validation.error! };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock the player row and read current kills
    const playerResult = await client.query(
      `SELECT COALESCE((data->>'kills')::int, 0) AS kills FROM players WHERE user_id = $1 FOR UPDATE`,
      [playerId]
    );

    if (playerResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "Player not found." };
    }

    const oldKills: number = playerResult.rows[0].kills;
    const delta = newKills - oldKills;

    // Update the kills inside the JSONB data column
    await client.query(
      `UPDATE players SET data = jsonb_set(data, '{kills}', $1::text::jsonb) WHERE user_id = $2`,
      [newKills, playerId]
    );

    // Write the immutable audit log entry
    await client.query(
      `
      INSERT INTO kills_audit_logs (player_id, old_kills, new_kills, added_kills, edited_by, reason)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [playerId, oldKills, newKills, delta, editedBy, reason.trim()]
    );

    await client.query("COMMIT");

    console.log(
      `[kills-admin] ${editedBy} updated ${playerId} kills: ${oldKills} → ${newKills} | reason: ${reason}`
    );

    return { success: true, oldKills };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`[kills-admin] updatePlayerKills(${playerId}, ${newKills}) failed:`, err);
    return { success: false, error: "Database error. Please try again." };
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// addPlayerKills — increment a player's kills by a given amount with audit log
// This is the sanctioned path for bot kill logging.
// ---------------------------------------------------------------------------

export async function addPlayerKills(
  playerId: string,
  killsToAdd: number,
  editedBy: string,
  reason: string
): Promise<{ success: true; oldKills: number; newKills: number } | { success: false; error: string }> {
  await ensureKillsAuditTable();

  const addValidation = validateKillsValue(killsToAdd);
  if (!addValidation.valid) {
    return { success: false, error: `killsToAdd is invalid: ${addValidation.error}` };
  }
  if (killsToAdd === 0) {
    return { success: false, error: "killsToAdd must be greater than 0." };
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Lock the player row and read current kills
    const playerResult = await client.query(
      `SELECT COALESCE((data->>'kills')::int, 0) AS kills FROM players WHERE user_id = $1 FOR UPDATE`,
      [playerId]
    );

    if (playerResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, error: "Player not found." };
    }

    const oldKills: number = playerResult.rows[0].kills;
    const newKills = Math.min(oldKills + killsToAdd, 99999);

    // Update the kills inside the JSONB data column
    await client.query(
      `UPDATE players SET data = jsonb_set(data, '{kills}', $1::text::jsonb) WHERE user_id = $2`,
      [newKills, playerId]
    );

    // Write the immutable audit log entry
    await client.query(
      `
      INSERT INTO kills_audit_logs (player_id, old_kills, new_kills, added_kills, edited_by, reason)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [playerId, oldKills, newKills, killsToAdd, editedBy, reason.trim()]
    );

    await client.query("COMMIT");

    console.log(
      `[kills-admin] ${editedBy} added ${killsToAdd} kills to ${playerId}: ${oldKills} → ${newKills} | reason: ${reason}`
    );

    return { success: true, oldKills, newKills };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`[kills-admin] addPlayerKills(${playerId}, +${killsToAdd}) failed:`, err);
    return { success: false, error: "Database error. Please try again." };
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// getKillsAuditLogs — paginated audit log retrieval
// Pass playerId to filter to a specific player, or omit for all logs.
// ---------------------------------------------------------------------------

export async function getKillsAuditLogs(
  playerId?: string,
  limit = 10,
  offset = 0
): Promise<{ logs: KillsAuditLog[]; total: number }> {
  await ensureKillsAuditTable();

  const whereClause = playerId ? `WHERE kal.player_id = $3` : "";
  const params: (string | number)[] = [limit, offset];
  if (playerId) params.push(playerId);

  const [logsResult, countResult] = await Promise.all([
    pool.query<KillsAuditLog>(
      `
      SELECT
        kal.id,
        kal.player_id,
        COALESCE(p.data->>'display_name', p.data->>'username', kal.player_id) AS player_name,
        kal.old_kills,
        kal.new_kills,
        kal.added_kills,
        kal.edited_by,
        kal.reason,
        kal.created_at
      FROM kills_audit_logs kal
      LEFT JOIN players p ON p.user_id = kal.player_id
      ${whereClause}
      ORDER BY kal.created_at DESC
      LIMIT $1 OFFSET $2
      `,
      params
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM kills_audit_logs ${playerId ? "WHERE player_id = $1" : ""}`,
      playerId ? [playerId] : []
    ),
  ]);

  return {
    logs: logsResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}
