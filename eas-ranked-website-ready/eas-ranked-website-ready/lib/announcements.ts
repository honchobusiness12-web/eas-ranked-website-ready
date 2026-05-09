import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Announcement {
  id: string;
  title: string;
  message: string;
  color: string;
  sound_enabled: boolean;
  ping_role_id: string | null;
  created_by: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Ensure table exists (idempotent)
// ---------------------------------------------------------------------------

async function ensureAnnouncementsTable(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        title        VARCHAR(255) NOT NULL,
        message      TEXT         NOT NULL,
        color        VARCHAR(50)  NOT NULL DEFAULT '#FF9F43',
        sound_enabled BOOLEAN     NOT NULL DEFAULT TRUE,
        ping_role_id VARCHAR(64),
        created_by   VARCHAR(32)  NOT NULL,
        created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
      )
    `);
  } catch (err) {
    console.error("[announcements] ensureAnnouncementsTable failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Create an announcement
// ---------------------------------------------------------------------------

export async function createAnnouncement(data: {
  title: string;
  message: string;
  color: string;
  sound_enabled: boolean;
  ping_role_id: string | null;
  created_by: string;
}): Promise<Announcement> {
  await ensureAnnouncementsTable();

  const result = await pool.query<Announcement>(
    `
    INSERT INTO announcements (title, message, color, sound_enabled, ping_role_id, created_by)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [
      data.title,
      data.message,
      data.color,
      data.sound_enabled,
      data.ping_role_id ?? null,
      data.created_by,
    ]
  );

  return result.rows[0];
}

// ---------------------------------------------------------------------------
// List recent announcements (newest first)
// ---------------------------------------------------------------------------

export async function listAnnouncements(limit = 20): Promise<Announcement[]> {
  await ensureAnnouncementsTable();

  const result = await pool.query<Announcement>(
    `SELECT * FROM announcements ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );

  return result.rows;
}

// ---------------------------------------------------------------------------
// Delete an announcement by ID
// ---------------------------------------------------------------------------

export async function deleteAnnouncement(id: string): Promise<boolean> {
  await ensureAnnouncementsTable();

  const result = await pool.query(
    `DELETE FROM announcements WHERE id = $1`,
    [id]
  );

  return (result.rowCount ?? 0) > 0;
}
