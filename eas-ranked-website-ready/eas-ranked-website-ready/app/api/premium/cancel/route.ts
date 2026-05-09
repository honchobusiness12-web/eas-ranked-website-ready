import { NextRequest, NextResponse } from "next/server";
import { revokePremium } from "@/lib/premium";

// ---------------------------------------------------------------------------
// POST /api/premium/cancel
// ---------------------------------------------------------------------------
// Revokes a manually-granted premium (clears premium_expires_at).
// Discord role premium (Buy Me a Coffee / Stripe) is managed by the bot —
// remove the Premium User role in Discord to revoke that access.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // Revoke the manual grant (premium_expires_at = NULL)
    await revokePremium(userId);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
