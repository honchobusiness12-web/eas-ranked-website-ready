import { NextRequest, NextResponse } from "next/server";
import { getPremiumStatus } from "@/lib/premium";

// ---------------------------------------------------------------------------
// GET /api/premium/subscription?userId=xxx
// ---------------------------------------------------------------------------
// Returns the premium status for a user. Premium is now sourced from:
//  1. Developer ID (permanent)
//  2. Discord Premium User role (data->>'premium' = true, set by Buy Me a Coffee bot)
//  3. Manual grant / giveaway code (premium_expires_at > NOW())
//
// There is no longer a separate subscriptions table.
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const status = await getPremiumStatus(userId);
  return NextResponse.json({
    subscription: status.premium
      ? {
          subscription_status: status.source,
          current_period_end: status.expiresAt?.toISOString() ?? null,
          source: status.source,
        }
      : null,
  });
}
