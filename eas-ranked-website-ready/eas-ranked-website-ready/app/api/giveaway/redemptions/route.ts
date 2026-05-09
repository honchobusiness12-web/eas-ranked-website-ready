import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCodeRedemptions } from "@/lib/giveaway";

// ---------------------------------------------------------------------------
// GET /api/giveaway/redemptions?code=EAS-1WEEK
// Requires: owner session
// ---------------------------------------------------------------------------

function isOwner(userId: string): boolean {
  const ownerIds = (process.env.OWNER_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (userId === "733871667788644445") return true;
  return ownerIds.includes(userId);
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Owner access required." }, { status: 403 });
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "code query parameter is required." }, { status: 400 });
  }

  try {
    const redemptions = await getCodeRedemptions(code);
    return NextResponse.json({ redemptions });
  } catch (err) {
    console.error("[giveaway/redemptions] Unexpected error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
