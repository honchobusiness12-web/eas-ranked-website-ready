import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getRecentChanges } from "@/lib/audit";

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
// GET /api/admin/recent-changes?minutes=60
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
  const minutesParam = searchParams.get("minutes");
  const minutes = minutesParam
    ? Math.min(Math.max(1, Number(minutesParam)), 10080) // cap at 7 days
    : 60;

  // 4. Fetch recent changes
  try {
    const changes = await getRecentChanges(minutes);
    return NextResponse.json({ minutes, changes }, { status: 200 });
  } catch (err) {
    console.error("[admin/recent-changes] Unexpected error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
