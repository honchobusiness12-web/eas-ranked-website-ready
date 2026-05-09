import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  DEVELOPER_USER_ID,
  STAFF_ROLE_IDS,
  CONTENT_CREATOR_ROLE_IDS,
  TOURNAMENT_WINNER_ROLE_IDS,
  getUserBadges,
  assignBadgeRole,
  removeBadgeRole,
} from "@/lib/premium";
import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Owner check
// ---------------------------------------------------------------------------

function isOwner(userId: string): boolean {
  if (userId === DEVELOPER_USER_ID) return true;
  const ownerIds = (process.env.OWNER_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ownerIds.includes(userId);
}

// Badge type → role ID mapping
const BADGE_ROLE_MAP: Record<string, string> = {
  staff: STAFF_ROLE_IDS[0],
  contentCreator: CONTENT_CREATOR_ROLE_IDS[0],
  tournamentWinner: TOURNAMENT_WINNER_ROLE_IDS[0],
};

// ---------------------------------------------------------------------------
// GET /api/admin/badges?userId=xxx — get badges for a user (owner only)
// GET /api/admin/badges?search=xxx — search users and their badges (owner only)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Owner access required." }, { status: 403 });
  }

  const userId = req.nextUrl.searchParams.get("userId");
  const search = req.nextUrl.searchParams.get("search");

  // Single user badge lookup
  if (userId) {
    try {
      const badges = await getUserBadges(userId);
      // Also fetch raw roles from DB
      const result = await pool.query(
        `SELECT user_id, name, data->'roles' AS roles FROM players WHERE user_id = $1 LIMIT 1`,
        [userId]
      );
      const player = result.rows[0] ?? null;
      return NextResponse.json({
        userId,
        name: player?.name ?? null,
        badges,
        roles: player?.roles ?? [],
      });
    } catch (err) {
      console.error("[api/admin/badges] GET single user failed:", err);
      return NextResponse.json({ error: "Failed to fetch badges" }, { status: 500 });
    }
  }

  // Search players by name
  if (search) {
    try {
      const result = await pool.query(
        `SELECT user_id, name, data->'roles' AS roles
         FROM players
         WHERE name ILIKE $1
         ORDER BY name ASC
         LIMIT 20`,
        [`%${search}%`]
      );
      return NextResponse.json({ players: result.rows });
    } catch (err) {
      console.error("[api/admin/badges] GET search failed:", err);
      return NextResponse.json({ error: "Failed to search players" }, { status: 500 });
    }
  }

  // List all players with badge roles
  try {
    const allRoleIds = [
      ...STAFF_ROLE_IDS,
      ...CONTENT_CREATOR_ROLE_IDS,
      ...TOURNAMENT_WINNER_ROLE_IDS,
    ];
    const result = await pool.query(
      `SELECT user_id, name, data->'roles' AS roles
       FROM players
       WHERE data->'roles' IS NOT NULL
         AND data->'roles' != '[]'::jsonb
       ORDER BY name ASC
       LIMIT 100`
    );
    // Filter to only players who have at least one badge role
    const players = result.rows.filter((row) => {
      const roles: string[] = row.roles ?? [];
      return allRoleIds.some((id) => roles.includes(id));
    });
    return NextResponse.json({ players });
  } catch (err) {
    console.error("[api/admin/badges] GET list failed:", err);
    return NextResponse.json({ error: "Failed to list badge holders" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/badges — assign badge to user (owner only)
// Body: { userId: string; badge: "staff" | "contentCreator" | "tournamentWinner" }
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Owner access required." }, { status: 403 });
  }

  let body: { userId?: string; badge?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { userId, badge } = body;

  if (!userId?.trim()) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (!badge || !BADGE_ROLE_MAP[badge]) {
    return NextResponse.json(
      { error: `badge must be one of: ${Object.keys(BADGE_ROLE_MAP).join(", ")}` },
      { status: 400 }
    );
  }

  const roleId = BADGE_ROLE_MAP[badge];

  try {
    await assignBadgeRole(userId.trim(), roleId);
    const badges = await getUserBadges(userId.trim());
    return NextResponse.json({ success: true, userId, badge, roleId, badges });
  } catch (err) {
    console.error("[api/admin/badges] POST failed:", err);
    return NextResponse.json({ error: "Failed to assign badge" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/badges — remove badge from user (owner only)
// Body: { userId: string; badge: "staff" | "contentCreator" | "tournamentWinner" }
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Owner access required." }, { status: 403 });
  }

  let body: { userId?: string; badge?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { userId, badge } = body;

  if (!userId?.trim()) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (!badge || !BADGE_ROLE_MAP[badge]) {
    return NextResponse.json(
      { error: `badge must be one of: ${Object.keys(BADGE_ROLE_MAP).join(", ")}` },
      { status: 400 }
    );
  }

  const roleId = BADGE_ROLE_MAP[badge];

  try {
    await removeBadgeRole(userId.trim(), roleId);
    const badges = await getUserBadges(userId.trim());
    return NextResponse.json({ success: true, userId, badge, roleId, badges });
  } catch (err) {
    console.error("[api/admin/badges] DELETE failed:", err);
    return NextResponse.json({ error: "Failed to remove badge" }, { status: 500 });
  }
}
