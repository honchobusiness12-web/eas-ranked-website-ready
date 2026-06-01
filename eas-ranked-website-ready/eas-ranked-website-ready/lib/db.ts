import { Pool } from "pg";

declare global {
  var easPool: Pool | undefined;
}

export const pool =
  global.easPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  global.easPool = pool;
}

// ---------------------------------------------------------------------------
// MVP / CR History helpers
// ---------------------------------------------------------------------------

export async function logMVP(
  userId: string,
  matchId: string,
  seasonId: string
): Promise<void> {
  await pool.query(
    `INSERT INTO mvp_history (user_id, match_id, season_id, awarded_at)
     VALUES ($1, $2, $3, NOW())`,
    [userId, matchId, seasonId]
  );
}

export async function logCRChange(
  userId: string,
  oldCR: number,
  newCR: number,
  matchId: string,
  seasonId: string
): Promise<void> {
  const change = newCR - oldCR;
  await pool.query(
    `INSERT INTO cr_history (user_id, old_cr, new_cr, change, match_id, season_id, recorded_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [userId, oldCR, newCR, change, matchId, seasonId]
  );
}

export async function getMVPHistory(
  userId: string,
  limit = 10
): Promise<Array<{ id: string; match_id: string; season_id: string; awarded_at: string }>> {
  const result = await pool.query(
    `SELECT id, match_id, season_id, awarded_at
     FROM mvp_history
     WHERE user_id = $1
     ORDER BY awarded_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}

export async function getCRHistory(
  userId: string,
  limit = 20
): Promise<Array<{ id: string; old_cr: number; new_cr: number; change: number; match_id: string; season_id: string; recorded_at: string }>> {
  const result = await pool.query(
    `SELECT id, old_cr, new_cr, change, match_id, season_id, recorded_at
     FROM cr_history
     WHERE user_id = $1
     ORDER BY recorded_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}
