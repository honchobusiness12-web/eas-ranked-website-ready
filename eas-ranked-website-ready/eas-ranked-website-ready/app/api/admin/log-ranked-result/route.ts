import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { logMVP, logCRChange, pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// Owner check helper
// ---------------------------------------------------------------------------

function isOwner(userId: string): boolean {
  const ownerIds = (process.env.OWNER_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return userId === "733871667788644445" || ownerIds.includes(userId);
}

// ---------------------------------------------------------------------------
// POST /api/admin/log-ranked-result
//
// Body:
// {
//   mvps: string[],                          // array of user IDs awarded MVP
//   crChanges: { userId, oldCR, newCR }[],   // CR delta per player
//   matchId: string,
//   seasonId: string
// }
//
// Logs each MVP to mvp_history, each CR change to cr_history, and updates
// the player's CR in the players table.
// ---------------------------------------------------------------------------

interface CRChange {
  userId: string;
  oldCR: number;
  newCR: number;
}

interface LogRankedResultBody {
  mvps?: string[];
  crChanges?: CRChange[];
  matchId?: string;
  seasonId?: string;
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Admin access required." }, { status: 403 });
  }

  // 2. Parse body
  let body: LogRankedResultBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { mvps = [], crChanges = [], matchId, seasonId } = body;

  if (!matchId || typeof matchId !== "string" || !matchId.trim()) {
    return NextResponse.json({ error: "matchId is required." }, { status: 400 });
  }
  if (!seasonId || typeof seasonId !== "string" || !seasonId.trim()) {
    return NextResponse.json({ error: "seasonId is required." }, { status: 400 });
  }
  if (!Array.isArray(mvps)) {
    return NextResponse.json({ error: "mvps must be an array." }, { status: 400 });
  }
  if (!Array.isArray(crChanges)) {
    return NextResponse.json({ error: "crChanges must be an array." }, { status: 400 });
  }

  const errors: string[] = [];
  const mvpResults: string[] = [];
  const crResults: Array<{ userId: string; oldCR: number; newCR: number; change: number }> = [];

  // 3. Log MVPs
  for (const userId of mvps) {
    if (!userId || typeof userId !== "string") {
      errors.push(`Invalid userId in mvps: ${userId}`);
      continue;
    }
    try {
      await logMVP(userId.trim(), matchId.trim(), seasonId.trim());
      // Increment mvp_count on the player record
      await pool.query(
        `UPDATE players
         SET data = jsonb_set(
           data,
           '{mvp_count}',
           to_jsonb(COALESCE((data->>'mvp_count')::int, 0) + 1)
         )
         WHERE user_id = $1`,
        [userId.trim()]
      );
      mvpResults.push(userId.trim());
    } catch (err) {
      errors.push(`Failed to log MVP for ${userId}: ${String(err)}`);
    }
  }

  // 4. Log CR changes
  for (const entry of crChanges) {
    const { userId, oldCR, newCR } = entry ?? {};
    if (!userId || typeof userId !== "string") {
      errors.push(`Invalid userId in crChanges: ${JSON.stringify(entry)}`);
      continue;
    }
    if (typeof oldCR !== "number" || typeof newCR !== "number") {
      errors.push(`oldCR and newCR must be numbers for userId ${userId}`);
      continue;
    }
    try {
      await logCRChange(userId.trim(), oldCR, newCR, matchId.trim(), seasonId.trim());
      // Update the player's CR in the players table
      await pool.query(
        `UPDATE players
         SET data = jsonb_set(data, '{cr}', to_jsonb($1::int))
         WHERE user_id = $2`,
        [newCR, userId.trim()]
      );
      crResults.push({ userId: userId.trim(), oldCR, newCR, change: newCR - oldCR });
    } catch (err) {
      errors.push(`Failed to log CR change for ${userId}: ${String(err)}`);
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    matchId: matchId.trim(),
    seasonId: seasonId.trim(),
    mvpsLogged: mvpResults,
    crChangesLogged: crResults,
    errors: errors.length > 0 ? errors : undefined,
  });
}
