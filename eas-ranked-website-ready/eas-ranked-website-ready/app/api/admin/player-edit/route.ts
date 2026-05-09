import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { logPlayerChange } from "@/lib/audit";

// ---------------------------------------------------------------------------
// Owner check helper (mirrors pattern used across admin routes)
// ---------------------------------------------------------------------------

function isOwner(userId: string): boolean {
  const ownerIds = (process.env.OWNER_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (userId === "733871667788644445") return true;
  return ownerIds.includes(userId);
}

// ---------------------------------------------------------------------------
// POST /api/admin/player-edit
// Body: { userId, newCr, reason, confirmed }
// Requires: owner session
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Require authentication
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // 2. Require owner
  if (!isOwner(session.userId)) {
    return NextResponse.json(
      { error: "Forbidden. Owner access required." },
      { status: 403 }
    );
  }

  // 3. Parse body
  let body: {
    userId?: string;
    newCr?: number;
    reason?: string;
    confirmed?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { userId, newCr, reason, confirmed } = body;

  // 4. Validate inputs
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }
  if (newCr === undefined || newCr === null || typeof newCr !== "number") {
    return NextResponse.json({ error: "newCr must be a number." }, { status: 400 });
  }
  if (newCr < 0 || newCr > 99999 || !Number.isInteger(newCr)) {
    return NextResponse.json(
      { error: "newCr must be a whole number between 0 and 99,999." },
      { status: 400 }
    );
  }
  if (!reason || typeof reason !== "string" || reason.trim().length < 3) {
    return NextResponse.json(
      { error: "A reason of at least 3 characters is required." },
      { status: 400 }
    );
  }
  if (confirmed !== true) {
    return NextResponse.json(
      { error: "confirmed must be true to apply changes." },
      { status: 400 }
    );
  }

  // 5. Fetch current player row
  let oldRow: Record<string, unknown> | null = null;
  try {
    const existing = await pool.query(
      `SELECT user_id, data FROM players WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: `Player ${userId} not found.` },
        { status: 404 }
      );
    }
    oldRow = existing.rows[0] as Record<string, unknown>;
  } catch (err) {
    console.error("[admin/player-edit] DB fetch failed:", err);
    return NextResponse.json({ error: "Database error." }, { status: 500 });
  }

  // 6. Apply the CR update
  let newRow: Record<string, unknown> | null = null;
  try {
    const updated = await pool.query(
      `
      UPDATE players
      SET data = jsonb_set(data, '{cr}', $1::text::jsonb)
      WHERE user_id = $2
      RETURNING user_id, data
      `,
      [newCr, userId]
    );
    newRow = updated.rows[0] as Record<string, unknown>;
  } catch (err) {
    console.error("[admin/player-edit] DB update failed:", err);
    return NextResponse.json({ error: "Failed to update player." }, { status: 500 });
  }

  // 7. Log the change to the audit table
  const auditEntry = await logPlayerChange(
    userId,
    oldRow,
    newRow,
    session.userId,
    reason.trim()
  );

  return NextResponse.json(
    {
      success: true,
      userId,
      oldCr: (oldRow.data as Record<string, unknown>)?.cr ?? null,
      newCr,
      auditEntry,
    },
    { status: 200 }
  );
}
