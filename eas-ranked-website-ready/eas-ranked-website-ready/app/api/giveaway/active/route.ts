import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

// ---------------------------------------------------------------------------
// GET /api/giveaway/active
// Public endpoint — returns active codes with limited info (no code value).
// Shows: uses_left, expires_at, duration_days so users know what's available.
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        id,
        duration_days,
        max_uses,
        uses,
        (max_uses - uses) AS uses_left,
        expires_at,
        created_at
      FROM premium_codes
      WHERE active = TRUE
        AND uses < max_uses
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at DESC
      LIMIT 10
    `);

    return NextResponse.json({ codes: result.rows });
  } catch (err) {
    console.error("[giveaway/active] Error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
