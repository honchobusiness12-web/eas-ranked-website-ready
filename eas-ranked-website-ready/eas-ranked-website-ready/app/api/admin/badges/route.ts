import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  DEVELOPER_USER_ID,
  PREMIUM_ROLE_ID,
  STAFF_ROLE_IDS,
  CONTENT_CREATOR_ROLE_IDS,
  TOURNAMENT_WINNER_ROLE_IDS,
  getUserBadges,
  assignBadgeRole,
  removeBadgeRole,
} from "@/lib/premium";
import { fetchAllUsersWithRole } from "@/lib/discord-roles";
import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Developer-only check
// ---------------------------------------------------------------------------

function isDeveloper(userId: string): boolean {
  return userId === DEVELOPER_USER_ID;
}

// Badge type → role ID mapping
const BADGE_ROLE_MAP: Record<string, string> = {
  staff: STAFF_ROLE_IDS[0],
  contentCreator: CONTENT_CREATOR_ROLE_IDS[0],
  tournamentWinner: TOURNAMENT_WINNER_ROLE_IDS[0],
};

// ---------------------------------------------------------------------------
// GET /api/admin/badges?userId=xxx        — get badges for a user (owner only)
// GET /api/admin/badges?search=xxx        — search ALL players by name or ID
// GET /api/admin/badges?role=xxx          — Discord role member list
// GET /api/admin/badges                   — list all players (not just badge holders)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDeveloper(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Developer access required." }, { status: 403 });
  }

  const userId = req.nextUrl.searchParams.get("userId");
  const search = req.nextUrl.searchParams.get("search");
  const role   = req.nextUrl.searchParams.get("role");
  const force  = req.nextUrl.searchParams.get("force") === "true";

  // Single user badge lookup
  if (userId) {
    try {
      const badges = await getUserBadges(userId);
      // Also fetch player info from DB
      const result = await pool.query(
        `SELECT
           user_id,
           COALESCE(data->>'display_name', data->>'username', name, 'Unknown Player') AS name,
           data->'roles' AS roles,
           COALESCE((data->>'cr')::int, 0)     AS cr,
           COALESCE((data->>'wins')::int, 0)    AS wins,
           COALESCE((data->>'losses')::int, 0)  AS losses,
           COALESCE((data->>'matches')::int, 0) AS matches
         FROM players WHERE user_id = $1 LIMIT 1`,
        [userId]
      );
      const player = result.rows[0] ?? null;
      return NextResponse.json({
        userId,
        name:    player?.name    ?? null,
        badges,
        roles:   player?.roles   ?? [],
        cr:      player?.cr      ?? 0,
        wins:    player?.wins    ?? 0,
        losses:  player?.losses  ?? 0,
        matches: player?.matches ?? 0,
        exists:  player !== null,
      });
    } catch (err) {
      console.error("[api/admin/badges] GET single user failed:", err);
      return NextResponse.json({ error: "Failed to fetch badges" }, { status: 500 });
    }
  }

  // Search ALL players by name OR Discord ID
  if (search) {
    try {
      const trimmed = search.trim();
      const result = await pool.query(
        `SELECT
           user_id,
           COALESCE(data->>'display_name', data->>'username', name, 'Unknown Player') AS name,
           data->'roles' AS roles,
           COALESCE((data->>'cr')::int, 0)    AS cr,
           COALESCE((data->>'wins')::int, 0)   AS wins,
           COALESCE((data->>'losses')::int, 0) AS losses
         FROM players
         WHERE
           LOWER(COALESCE(data->>'display_name', data->>'username', name, '')) ILIKE $1
           OR user_id = $2
         ORDER BY COALESCE((data->>'cr')::int, 0) DESC
         LIMIT 25`,
        [`%${trimmed.toLowerCase()}%`, trimmed]
      );
      return NextResponse.json({ players: result.rows });
    } catch (err) {
      console.error("[api/admin/badges] GET search failed:", err);
      return NextResponse.json({ error: "Failed to search players" }, { status: 500 });
    }
  }

  // Discord role member lookup — returns all guild members with the given role
  if (role) {
    const ROLE_MAP: Record<string, string> = {
      contentCreator: CONTENT_CREATOR_ROLE_IDS[0],
      staff:          STAFF_ROLE_IDS[0],
      premium:        PREMIUM_ROLE_ID,
    };
    const roleId = ROLE_MAP[role];
    if (!roleId) {
      return NextResponse.json(
        { error: `role must be one of: ${Object.keys(ROLE_MAP).join(", ")}` },
        { status: 400 }
      );
    }
    try {
      const members = await fetchAllUsersWithRole(roleId, force);
      return NextResponse.json({ members });
    } catch (err) {
      console.error("[api/admin/badges] GET role members failed:", err);
      return NextResponse.json({ error: "Failed to fetch role members" }, { status: 500 });
    }
  }

  // Default: list ALL players ordered by CR (not just badge holders)
  try {
    const result = await pool.query(
      `SELECT
         user_id,
         COALESCE(data->>'display_name', data->>'username', name, 'Unknown Player') AS name,
         data->'roles' AS roles,
         COALESCE((data->>'cr')::int, 0)    AS cr,
         COALESCE((data->>'wins')::int, 0)   AS wins,
         COALESCE((data->>'losses')::int, 0) AS losses
       FROM players
       ORDER BY COALESCE((data->>'cr')::int, 0) DESC
       LIMIT 100`
    );
    return NextResponse.json({ players: result.rows });
  } catch (err) {
    console.error("[api/admin/badges] GET list failed:", err);
    return NextResponse.json({ error: "Failed to list players" }, { status: 500 });
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
  if (!isDeveloper(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Developer access required." }, { status: 403 });
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
  if (!isDeveloper(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Developer access required." }, { status: 403 });
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

// ---------------------------------------------------------------------------
// PUT /api/admin/badges — create a minimal player record (owner only)
// Body: { userId: string; name?: string }
// Creates the player row if it doesn't exist, then returns the player data.
// ---------------------------------------------------------------------------

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDeveloper(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Developer access required." }, { status: 403 });
  }

  let body: { userId?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { userId, name } = body;

  if (!userId?.trim()) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const uid  = userId.trim();
  const displayName = name?.trim() || uid;

  try {
    // Check if player already exists
    const existing = await pool.query(
      `SELECT user_id FROM players WHERE user_id = $1 LIMIT 1`,
      [uid]
    );

    if (existing.rows.length > 0) {
      // Player already exists — just return their current data
      const result = await pool.query(
        `SELECT
           user_id,
           COALESCE(data->>'display_name', data->>'username', name, 'Unknown Player') AS name,
           data->'roles' AS roles,
           COALESCE((data->>'cr')::int, 0)     AS cr,
           COALESCE((data->>'wins')::int, 0)    AS wins,
           COALESCE((data->>'losses')::int, 0)  AS losses,
           COALESCE((data->>'matches')::int, 0) AS matches
         FROM players WHERE user_id = $1 LIMIT 1`,
        [uid]
      );
      const badges = await getUserBadges(uid);
      const player = result.rows[0];
      return NextResponse.json({
        created: false,
        userId: uid,
        name:    player?.name    ?? displayName,
        badges,
        roles:   player?.roles   ?? [],
        cr:      player?.cr      ?? 0,
        wins:    player?.wins    ?? 0,
        losses:  player?.losses  ?? 0,
        matches: player?.matches ?? 0,
        exists:  true,
      });
    }

    // Create a minimal player record
    await pool.query(
      `INSERT INTO players (user_id, name, data)
       VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (user_id) DO NOTHING`,
      [
        uid,
        displayName,
        JSON.stringify({
          display_name: displayName,
          username:     displayName,
          cr:           0,
          wins:         0,
          losses:       0,
          matches:      0,
          roles:        [],
          registered:   false,
          ranked:       false,
        }),
      ]
    );

    const badges = await getUserBadges(uid);
    return NextResponse.json({
      created: true,
      userId:  uid,
      name:    displayName,
      badges,
      roles:   [],
      cr:      0,
      wins:    0,
      losses:  0,
      matches: 0,
      exists:  true,
    });
  } catch (err) {
    console.error("[api/admin/badges] PUT failed:", err);
    return NextResponse.json({ error: "Failed to create player record" }, { status: 500 });
  }
}
