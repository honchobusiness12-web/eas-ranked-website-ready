import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPlayerAuditHistory } from "@/lib/audit";

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
// GET /api/admin/player-history?userId=...&limit=50
// Requires: owner session
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
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

  // 3. Parse query params
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId")?.trim();
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(1, Number(limitParam)), 200) : 50;

  if (!userId) {
    return NextResponse.json({ error: "userId query param is required." }, { status: 400 });
  }

  // 4. Fetch audit history
  try {
    const history = await getPlayerAuditHistory(userId, limit);
    return NextResponse.json({ userId, history }, { status: 200 });
  } catch (err) {
    console.error("[admin/player-history] Unexpected error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
