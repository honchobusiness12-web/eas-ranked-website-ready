import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { logCREdit, DEVELOPER_USER_ID } from "@/lib/premium";

// ---------------------------------------------------------------------------
// Owner guard (mirrors the pattern used in /api/giveaway/create)
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
// POST /api/admin/cr/edit
// Body: { player_id, new_cr, reason? }
// Requires: owner session
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Auth
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Owner access required." }, { status: 403 });
  }

  // 2. Parse body
  let body: { player_id?: string; new_cr?: number; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const playerId = (body.player_id ?? "").trim();
  const newCr = Number(body.new_cr);
  const reason = (body.reason ?? "").trim() || null;

  // 3. Validate
  if (!playerId) {
    return NextResponse.json({ error: "player_id is required." }, { status: 400 });
  }
  if (!Number.isInteger(newCr) || newCr < 0 || newCr > 10000) {
    return NextResponse.json(
      { error: "new_cr must be an integer between 0 and 10000." },
      { status: 400 }
    );
  }

  // 4. Fetch current CR
  let oldCr: number;
  try {
    const playerResult = await pool.query(
      `SELECT COALESCE((data->>'cr')::int, 0) AS cr FROM players WHERE user_id = $1`,
      [playerId]
    );
    if (playerResult.rows.length === 0) {
      return NextResponse.json({ error: "Player not found." }, { status: 404 });
    }
    oldCr = playerResult.rows[0].cr;
  } catch (err) {
    console.error("[admin/cr/edit] DB lookup failed:", err);
    return NextResponse.json({ error: "Database error." }, { status: 500 });
  }

  if (oldCr === newCr) {
    return NextResponse.json(
      { error: "new_cr is the same as the current CR. No change made." },
      { status: 400 }
    );
  }

  // 5. Apply update + log in a transaction
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE players SET data = jsonb_set(data, '{cr}', $1::text::jsonb) WHERE user_id = $2`,
      [newCr, playerId]
    );

    const auditEntry = await logCREdit({
      editedBy: session.userId,
      playerId,
      oldCr,
      newCr,
      reason: reason ?? undefined,
      reversible: true,
    });

    await client.query("COMMIT");

    return NextResponse.json(
      {
        ok: true,
        player_id: playerId,
        old_cr: oldCr,
        new_cr: newCr,
        audit_id: auditEntry?.id ?? null,
      },
      { status: 200 }
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[admin/cr/edit] Transaction failed:", err);
    return NextResponse.json({ error: "Failed to update CR." }, { status: 500 });
  } finally {
    client.release();
  }
}
