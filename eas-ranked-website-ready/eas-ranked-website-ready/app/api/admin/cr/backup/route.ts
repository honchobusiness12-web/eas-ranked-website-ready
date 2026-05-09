import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { DEVELOPER_USER_ID } from "@/lib/premium";

// ---------------------------------------------------------------------------
// Owner guard
// ---------------------------------------------------------------------------

function isOwner(userId: string): boolean {
  if (userId === DEVELOPER_USER_ID) return true;
  const ownerIds = (process.env.OWNER_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ownerIds.includes(userId);
}

// ---------------------------------------------------------------------------
// Ensure the cr_backups table exists
// ---------------------------------------------------------------------------

async function ensureBackupTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cr_backups (
      id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
      snapshot    JSONB     NOT NULL,
      player_count INT      NOT NULL,
      created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
      created_by  VARCHAR(32)
    )
  `);
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_cr_backups_created_at ON cr_backups(created_at DESC)`
  );
}

// ---------------------------------------------------------------------------
// POST /api/admin/cr/backup
// Requires: owner session OR valid CRON_SECRET bearer token
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // Allow both owner sessions and cron secret
  const authHeader = req.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET;
  const isCron =
    cronSecret &&
    (authHeader === `Bearer ${cronSecret}` || authHeader === cronSecret);

  let createdBy = "cron";

  if (!isCron) {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    if (!isOwner(session.userId)) {
      return NextResponse.json({ error: "Forbidden. Owner access required." }, { status: 403 });
    }
    createdBy = session.userId;
  }

  try {
    await ensureBackupTable();

    // Snapshot all player CR values
    const playersResult = await pool.query(`
      SELECT
        user_id,
        COALESCE(data->>'display_name', data->>'username', user_id::text) AS name,
        COALESCE((data->>'cr')::int, 0) AS cr
      FROM players
      ORDER BY cr DESC
    `);

    const snapshot = playersResult.rows;

    // Persist the snapshot
    const insertResult = await pool.query(
      `
      INSERT INTO cr_backups (snapshot, player_count, created_by)
      VALUES ($1, $2, $3)
      RETURNING id, player_count, created_at
      `,
      [JSON.stringify(snapshot), snapshot.length, createdBy]
    );

    // Prune backups older than 30 days
    await pool.query(`
      DELETE FROM cr_backups
      WHERE created_at < NOW() - INTERVAL '30 days'
    `);

    const backup = insertResult.rows[0];
    return NextResponse.json({
      ok: true,
      backup_id: backup.id,
      player_count: backup.player_count,
      created_at: backup.created_at,
    });
  } catch (err) {
    console.error("[admin/cr/backup] Failed:", err);
    return NextResponse.json({ error: "Backup failed." }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET /api/admin/cr/backup — list recent backups (owner only)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Owner access required." }, { status: 403 });
  }

  try {
    await ensureBackupTable();

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "30"), 90);

    const result = await pool.query(
      `
      SELECT id, player_count, created_at, created_by
      FROM cr_backups
      ORDER BY created_at DESC
      LIMIT $1
      `,
      [limit]
    );

    return NextResponse.json({ ok: true, backups: result.rows });
  } catch (err) {
    console.error("[admin/cr/backup] GET failed:", err);
    return NextResponse.json({ error: "Failed to list backups." }, { status: 500 });
  }
}
