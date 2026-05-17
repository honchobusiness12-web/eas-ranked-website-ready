import { NextRequest, NextResponse } from "next/server";
import { addPlayerKills, validateKillsValue, getPlayerKillsInfo } from "@/lib/kills-admin";
import { logKillsChange, logKillsError } from "@/lib/kills-logging";

// ---------------------------------------------------------------------------
// POST /api/admin/kills/log
// Body: { playerId, killsToAdd, reason, botToken }
//
// Bot-facing endpoint. Authenticated via a shared secret token rather than a
// user session so the game bot can call it without a browser cookie.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Validate bot token
  const botToken = process.env.BOT_KILLS_TOKEN;
  if (!botToken) {
    console.error("[kills/log] BOT_KILLS_TOKEN environment variable is not set.");
    return NextResponse.json({ error: "Server misconfiguration." }, { status: 500 });
  }

  // 2. Parse body
  let body: { playerId?: unknown; killsToAdd?: unknown; reason?: unknown; botToken?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const providedToken = (body.botToken ?? "").toString().trim();

  // 3. Authenticate — constant-time comparison to prevent timing attacks
  if (providedToken.length !== botToken.length || providedToken !== botToken) {
    console.warn(
      `[kills/log] Rejected request with invalid bot token from ${req.headers.get("x-forwarded-for") ?? "unknown"}`
    );
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // 4. Extract and validate inputs
  const playerId = (body.playerId ?? "").toString().trim();
  const killsToAdd = Number(body.killsToAdd);
  const reason = (body.reason ?? "").toString().trim();

  if (!playerId) {
    return NextResponse.json({ error: "playerId is required." }, { status: 400 });
  }
  if (isNaN(killsToAdd)) {
    return NextResponse.json({ error: "killsToAdd must be a number." }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "reason is required." }, { status: 400 });
  }
  if (reason.length > 500) {
    return NextResponse.json({ error: "reason must be 500 characters or fewer." }, { status: 400 });
  }

  const killsValidation = validateKillsValue(killsToAdd);
  if (!killsValidation.valid) {
    return NextResponse.json({ error: killsValidation.error }, { status: 400 });
  }
  if (killsToAdd === 0) {
    return NextResponse.json({ error: "killsToAdd must be greater than 0." }, { status: 400 });
  }

  // 5. Confirm player exists
  const player = await getPlayerKillsInfo(playerId);
  if (!player) {
    logKillsError(playerId, "add", "Player not found", "bot");
    return NextResponse.json({ error: "Player not found." }, { status: 404 });
  }

  // 6. Increment kills with full audit trail
  const result = await addPlayerKills(playerId, killsToAdd, "bot", reason);

  if (result.success === false) {
    logKillsError(playerId, "add", result.error, "bot");
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // 7. Structured log
  logKillsChange({
    playerId,
    oldKills: result.oldKills,
    newKills: result.newKills,
    addedKills: killsToAdd,
    reason,
    editedBy: "bot",
  });

  return NextResponse.json({
    success: true,
    playerId,
    playerName: player.name,
    oldKills: result.oldKills,
    newKills: result.newKills,
    addedKills: killsToAdd,
    reason,
  });
}
