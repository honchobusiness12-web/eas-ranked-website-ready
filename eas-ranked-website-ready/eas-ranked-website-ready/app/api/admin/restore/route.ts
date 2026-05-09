import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import { logPlayerChange, ensureAuditTable } from "@/lib/audit";

// ---------------------------------------------------------------------------
// Owner check helper
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
// POST /api/admin/restore
// Body: { playerIds: string[], fromMinutesAgo: number }
// Requires: owner session
// Restores each player to the state captured in the audit log N minutes ago.
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
  let body: { playerIds?: string[]; fromMinutesAgo?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { playerIds, fromMinutesAgo } = body;

  // 4. Validate inputs
  if (!Array.isArray(playerIds) || playerIds.length === 0) {
    return NextResponse.json(
      { error: "playerIds must be a non-empty array." },
      { status: 400 }
    );
  }
  if (playerIds.length > 10) {
    return NextResponse.json(
      { error: "Cannot restore more than 10 players at once." },
      { status: 400 }
    );
  }
  if (
    fromMinutesAgo === undefined ||
    typeof fromMinutesAgo !== "number" ||
    fromMinutesAgo < 1 ||
    fromMinutesAgo > 10080
  ) {
    return NextResponse.json(
      { error: "fromMinutesAgo must be a number between 1 and 10080 (7 days)." },
      { status: 400 }
    );
  }

  await ensureAuditTable();

  const results: Array<{
    userId: string;
    status: "restored" | "no_snapshot" | "error";
    restoredCr?: number | null;
    currentCr?: number | null;
    message?: string;
  }> = [];

  for (const userId of playerIds) {
    try {
      // Find the most recent audit snapshot taken BEFORE the cutoff time
      const snapshotResult = await pool.query(
        `
        SELECT old_data, old_cr
        FROM player_audit_log
        WHERE user_id = $1
          AND changed_at >= NOW() - ($2 || ' minutes')::interval
        ORDER BY changed_at ASC
        LIMIT 1
        `,
        [userId, fromMinutesAgo]
      );

      if (snapshotResult.rows.length === 0) {
        results.push({
          userId,
          status: "no_snapshot",
          message: `No audit snapshot found for player ${userId} in the last ${fromMinutesAgo} minutes.`,
        });
        continue;
      }

      const snapshot = snapshotResult.rows[0];
      const restoredData = snapshot.old_data as Record<string, unknown> | null;

      if (!restoredData) {
        results.push({
          userId,
          status: "no_snapshot",
          message: `Snapshot for player ${userId} has no old_data to restore from.`,
        });
        continue;
      }

      // Fetch current player row for audit logging
      const currentResult = await pool.query(
        `SELECT user_id, data FROM players WHERE user_id = $1 LIMIT 1`,
        [userId]
      );
      const currentRow =
        currentResult.rows.length > 0
          ? (currentResult.rows[0] as Record<string, unknown>)
          : null;

      // Restore the player's data column to the snapshot's old_data
      const dataToRestore = restoredData.data ?? restoredData;
      await pool.query(
        `UPDATE players SET data = $1 WHERE user_id = $2`,
        [JSON.stringify(dataToRestore), userId]
      );

      // Log the restore action
      await logPlayerChange(
        userId,
        currentRow,
        { user_id: userId, data: dataToRestore },
        session.userId,
        `Emergency restore to state from ${fromMinutesAgo} minutes ago`
      );

      const restoredCr =
        typeof (dataToRestore as Record<string, unknown>).cr === "number"
          ? ((dataToRestore as Record<string, unknown>).cr as number)
          : snapshot.old_cr;

      const currentCr =
        currentRow &&
        typeof (currentRow.data as Record<string, unknown>)?.cr === "number"
          ? ((currentRow.data as Record<string, unknown>).cr as number)
          : null;

      results.push({ userId, status: "restored", restoredCr, currentCr });
    } catch (err) {
      console.error(`[admin/restore] Failed to restore player ${userId}:`, err);
      results.push({
        userId,
        status: "error",
        message: `Unexpected error restoring player ${userId}.`,
      });
    }
  }

  const restoredCount = results.filter((r) => r.status === "restored").length;

  return NextResponse.json(
    {
      success: true,
      restoredCount,
      totalRequested: playerIds.length,
      results,
    },
    { status: 200 }
  );
}
