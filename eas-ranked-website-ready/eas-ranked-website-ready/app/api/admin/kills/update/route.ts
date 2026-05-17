import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { DEVELOPER_USER_ID } from "@/lib/premium";
import { updatePlayerKills, validateKillsValue, getPlayerKillsInfo } from "@/lib/kills-admin";
import { logKillsChange, logKillsError } from "@/lib/kills-logging";

// ---------------------------------------------------------------------------
// POST /api/admin/kills/update
// Body: { playerId, newKills, reason }
// Requires: authenticated owner session
// Sets a player's kills to a specific value and writes an audit log entry.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Require authentication
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // 2. Require owner
  if (session.userId !== DEVELOPER_USER_ID) {
    return NextResponse.json({ error: "Forbidden. Developer access required." }, { status: 403 });
  }

  // 3. Parse body
  let body: { playerId?: string; newKills?: unknown; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const playerId = (body.playerId ?? "").toString().trim();
  const newKills = Number(body.newKills);
  const reason = (body.reason ?? "").toString().trim();

  // 4. Validate inputs
  if (!playerId) {
    return NextResponse.json({ error: "playerId is required." }, { status: 400 });
  }
  if (isNaN(newKills)) {
    return NextResponse.json({ error: "newKills must be a number." }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "reason is required." }, { status: 400 });
  }
  if (reason.length > 500) {
    return NextResponse.json({ error: "reason must be 500 characters or fewer." }, { status: 400 });
  }

  const killsValidation = validateKillsValue(newKills);
  if (!killsValidation.valid) {
    return NextResponse.json({ error: killsValidation.error }, { status: 400 });
  }

  // 5. Confirm player exists before attempting update
  const player = await getPlayerKillsInfo(playerId);
  if (!player) {
    logKillsError(playerId, "set", "Player not found", session.userId);
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  // 6. Perform the update (single player, with audit log)
  const result = await updatePlayerKills(playerId, newKills, session.userId, reason);

  if (result.success === false) {
    logKillsError(playerId, "set", result.error, session.userId);
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // 7. Structured log
  logKillsChange({
    playerId,
    oldKills: result.oldKills,
    newKills,
    reason,
    editedBy: session.userId,
  });

  return NextResponse.json({
    success: true,
    playerId,
    playerName: player.name,
    oldKills: result.oldKills,
    newKills,
    editedBy: session.userId,
    reason,
  });
}
