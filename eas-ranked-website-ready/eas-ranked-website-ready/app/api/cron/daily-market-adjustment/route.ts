import { NextRequest, NextResponse } from "next/server";
import { runDailyMarketAdjustment } from "@/lib/cron/daily-market-adjustment";

// ---------------------------------------------------------------------------
// POST /api/cron/daily-market-adjustment
//
// Trigger the daily market value recalculation.
// Protected by a CRON_SECRET environment variable — set this in your
// deployment environment and pass it as the Authorization header:
//   Authorization: Bearer <CRON_SECRET>
//
// This endpoint is designed to be called by an external scheduler
// (e.g. Railway cron, Vercel cron, GitHub Actions, etc.) once per day.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is set, require it in the Authorization header
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "").trim();
    if (token !== cronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const result = await runDailyMarketAdjustment();

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}

// Also allow GET for easy manual triggering from the browser (dev only)
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Use POST in production" }, { status: 405 });
  }
  return POST(req);
}
