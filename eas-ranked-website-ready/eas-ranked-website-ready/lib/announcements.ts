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
  created_by: string;
  created_at: string;
  dismissed_by: string[];
}

export type AnnouncementColor =
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple";

export const ANNOUNCEMENT_COLORS: { id: AnnouncementColor; label: string; hex: string; bg: string; border: string; text: string }[] = [
  { id: "red",    label: "🔴 Urgent",   hex: "#EF4444", bg: "bg-red-950/30",    border: "border-red-700/50",    text: "text-red-300"    },
  { id: "orange", label: "🟠 Update",   hex: "#FF9F43", bg: "bg-orange-950/30", border: "border-orange-700/50", text: "text-orange-300" },
  { id: "yellow", label: "🟡 Info",     hex: "#FFD93D", bg: "bg-yellow-950/30", border: "border-yellow-700/50", text: "text-yellow-300" },
  { id: "green",  label: "🟢 Success",  hex: "#00FF88", bg: "bg-green-950/30",  border: "border-green-700/50",  text: "text-green-300"  },
  { id: "blue",   label: "🔵 Feature",  hex: "#0099FF", bg: "bg-blue-950/30",   border: "border-blue-700/50",   text: "text-blue-300"   },
  { id: "purple", label: "🟣 Special",  hex: "#A855F7", bg: "bg-purple-950/30", border: "border-purple-700/50", text: "text-purple-300" },
];

// ---------------------------------------------------------------------------
// Ensure table exists
// ---------------------------------------------------------------------------

async function ensureAnnouncementsTable(): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        title        VARCHAR(255) NOT NULL,
        message      TEXT         NOT NULL,
        color        VARCHAR(32)  NOT NULL DEFAULT 'blue',
        sound_enabled BOOLEAN     NOT NULL DEFAULT FALSE,
        created_by   VARCHAR(32)  NOT NULL,
        created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
        dismissed_by JSONB        NOT NULL DEFAULT '[]'::jsonb
      )
    `);
  } catch (err) {
    console.error("[announcements] ensureAnnouncementsTable failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Create announcement
// ---------------------------------------------------------------------------

export async function createAnnouncement(
  title: string,
  message: string,
  color: AnnouncementColor,
  soundEnabled: boolean,
  createdBy: string
): Promise<Announcement> {
  await ensureAnnouncementsTable();

  const result = await pool.query<Announcement>(
    `
    INSERT INTO announcements (title, message, color, sound_enabled, created_by)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [title, message, color, soundEnabled, createdBy]
  );

  return result.rows[0];
}

// ---------------------------------------------------------------------------
// Get recent announcements (admin view — all)
// ---------------------------------------------------------------------------

export async function getAnnouncements(limit = 20): Promise<Announcement[]> {
  await ensureAnnouncementsTable();

  const result = await pool.query<Announcement>(
    `SELECT * FROM announcements ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );

  return result.rows;
}

// ---------------------------------------------------------------------------
// Get current (non-dismissed) announcements for a user
// ---------------------------------------------------------------------------

export async function getCurrentAnnouncements(userId?: string): Promise<Announcement[]> {
  await ensureAnnouncementsTable();

  if (userId) {
    const result = await pool.query<Announcement>(
      `
      SELECT * FROM announcements
      WHERE NOT (dismissed_by @> $1::jsonb)
      ORDER BY created_at DESC
      LIMIT 10
      `,
      [JSON.stringify([userId])]
    );
    return result.rows;
  }

  // No user — return all recent
  const result = await pool.query<Announcement>(
    `SELECT * FROM announcements ORDER BY created_at DESC LIMIT 10`
  );
  return result.rows;
}

// ---------------------------------------------------------------------------
// Delete announcement
// ---------------------------------------------------------------------------

export async function deleteAnnouncement(id: string): Promise<boolean> {
  await ensureAnnouncementsTable();

  const result = await pool.query(
    `DELETE FROM announcements WHERE id = $1`,
    [id]
  );

  return (result.rowCount ?? 0) > 0;
}

// ---------------------------------------------------------------------------
// Dismiss announcement for a user
// ---------------------------------------------------------------------------

export async function dismissAnnouncement(announcementId: string, userId: string): Promise<void> {
  await ensureAnnouncementsTable();

  await pool.query(
    `
    UPDATE announcements
    SET dismissed_by = dismissed_by || $1::jsonb
    WHERE id = $2
      AND NOT (dismissed_by @> $1::jsonb)
    `,
    [JSON.stringify([userId]), announcementId]
  );
}

// ---------------------------------------------------------------------------
// Update announcement
// ---------------------------------------------------------------------------

export async function updateAnnouncement(
  id: string,
  title: string,
  message: string,
  color: AnnouncementColor,
  soundEnabled: boolean
): Promise<Announcement | null> {
  await ensureAnnouncementsTable();

  const result = await pool.query<Announcement>(
    `
    UPDATE announcements
    SET title = $1, message = $2, color = $3, sound_enabled = $4
    WHERE id = $5
    RETURNING *
    `,
    [title, message, color, soundEnabled, id]
  );

  return result.rows[0] ?? null;
}
