import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// GET /api/scrims/active
// Returns the currently active scrim session (if any).
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT scrim_id, scrim_type, league_host_name, player_count, start_time
       FROM scrim_sessions
       WHERE status = 'active'
       LIMIT 1`
    );

    const scrim = result.rows[0];

    if (!scrim) {
      return NextResponse.json({ active: false });
    }

    const minutesElapsed = Math.floor(
      (Date.now() - new Date(scrim.start_time).getTime()) / 60000
    );

    return NextResponse.json({
      active: true,
      scrim: {
        scrimId: scrim.scrim_id,
        type: scrim.scrim_type === "ranked" ? "🏆 Ranked" : "📋 Placement",
        host: scrim.league_host_name,
        playerCount: scrim.player_count,
        startedMinutesAgo: minutesElapsed,
      },
    });
  } catch (error) {
    console.error("Failed to fetch active scrim:", error);
    return NextResponse.json({ active: false });
  }
}
