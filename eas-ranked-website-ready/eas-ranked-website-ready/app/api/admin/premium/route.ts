import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  DEVELOPER_USER_ID,
  getPremiumStatus,
  grantPremium,
  revokePremium,
} from "@/lib/premium";
import { pool } from "@/lib/db";

// Premium is sourced from:
//  1. Developer ID (permanent)
//  2. Discord Premium User role — set by Buy Me a Coffee bot (data->>'premium' = true)
//  3. Manual grant / giveaway code (premium_expires_at > NOW())

// ---------------------------------------------------------------------------
// Developer-only guard
// ---------------------------------------------------------------------------

function isDeveloper(userId: string): boolean {
  return userId === DEVELOPER_USER_ID;
}

// ---------------------------------------------------------------------------
// GET /api/admin/premium
//   ?userId=xxx        — get full premium status for a single user
//   ?search=xxx        — search players by name or Discord ID
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

  // ------------------------------------------------------------------
  // Single user premium status lookup
  // ------------------------------------------------------------------
  if (userId) {
    try {
      const [status, playerResult] = await Promise.all([
        getPremiumStatus(userId),
        pool.query(
          `SELECT
             user_id,
             COALESCE(data->>'display_name', data->>'username', 'Unknown Player') AS name,
             data->>'avatar_url' AS avatar_url,
             premium_expires_at,
             (data->>'premium')::boolean AS discord_premium
           FROM players
           WHERE user_id = $1
           LIMIT 1`,
          [userId]
        ),
      ]);

      const player = playerResult.rows[0] ?? null;

      return NextResponse.json({
        userId,
        name: player?.name ?? null,
        avatarUrl: player?.avatar_url ?? null,
        premium: status.premium,
        source: status.source,
        expiresAt: status.expiresAt?.toISOString() ?? null,
        // Raw fields for full transparency
        premiumExpiresAt: player?.premium_expires_at ?? null,
        discordPremium: player?.discord_premium ?? false,
        // No subscription table — premium comes from Discord role or manual grant
        subscription: null,
        isDeveloper: userId === DEVELOPER_USER_ID,
      });
    } catch (err) {
      console.error("[api/admin/premium] GET single failed:", err);
      return NextResponse.json({ error: "Failed to fetch premium status" }, { status: 500 });
    }
  }

  // ------------------------------------------------------------------
  // Search players by name or Discord ID
  // ------------------------------------------------------------------
  if (search) {
    try {
      const isIdSearch = /^\d{17,19}$/.test(search.trim());
      const result = isIdSearch
        ? await pool.query(
            `SELECT user_id,
                    COALESCE(data->>'display_name', data->>'username', 'Unknown Player') AS name,
                    data->>'avatar_url' AS avatar_url,
                    premium_expires_at
             FROM players
             WHERE user_id = $1
             LIMIT 10`,
            [search.trim()]
          )
        : await pool.query(
            `SELECT user_id,
                    COALESCE(data->>'display_name', data->>'username', 'Unknown Player') AS name,
                    data->>'avatar_url' AS avatar_url,
                    premium_expires_at
             FROM players
             WHERE name ILIKE $1
                OR COALESCE(data->>'display_name', '') ILIKE $1
                OR COALESCE(data->>'username', '') ILIKE $1
             ORDER BY name ASC
             LIMIT 10`,
            [`%${search}%`]
          );
      return NextResponse.json({ players: result.rows });
    } catch (err) {
      console.error("[api/admin/premium] GET search failed:", err);
      return NextResponse.json({ error: "Failed to search players" }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: "Provide ?userId=xxx or ?search=xxx" },
    { status: 400 }
  );
}

// ---------------------------------------------------------------------------
// POST /api/admin/premium — grant premium to a user
// Body: { userId: string; expiresAt?: string (ISO date) }
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDeveloper(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Developer access required." }, { status: 403 });
  }

  let body: { userId?: string; expiresAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { userId, expiresAt } = body;

  if (!userId?.trim()) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Validate optional expiry date
  let expiry: Date | undefined;
  if (expiresAt) {
    expiry = new Date(expiresAt);
    if (isNaN(expiry.getTime())) {
      return NextResponse.json({ error: "Invalid expiresAt date" }, { status: 400 });
    }
    if (expiry <= new Date()) {
      return NextResponse.json({ error: "expiresAt must be in the future" }, { status: 400 });
    }
  }

  try {
    await grantPremium(userId.trim(), expiry);
    const status = await getPremiumStatus(userId.trim());
    return NextResponse.json({
      success: true,
      userId,
      premium: status.premium,
      source: status.source,
      expiresAt: status.expiresAt?.toISOString() ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to grant premium";
    console.error("[api/admin/premium] POST failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/admin/premium — revoke manually-granted premium from a user
// Body: { userId: string }
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDeveloper(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Developer access required." }, { status: 403 });
  }

  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { userId } = body;

  if (!userId?.trim()) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    await revokePremium(userId.trim());
    const status = await getPremiumStatus(userId.trim());
    return NextResponse.json({
      success: true,
      userId,
      premium: status.premium,
      source: status.source,
      expiresAt: status.expiresAt?.toISOString() ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to revoke premium";
    console.error("[api/admin/premium] DELETE failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
