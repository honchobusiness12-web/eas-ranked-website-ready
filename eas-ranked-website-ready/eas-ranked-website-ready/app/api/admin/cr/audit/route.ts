import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCRAuditLog, DEVELOPER_USER_ID } from "@/lib/premium";

// ---------------------------------------------------------------------------
// Owner guard
// ---------------------------------------------------------------------------

function isOwner(userId: string): boolean {
  if (userId === DEVELOPER_USER_ID) return true;
  const ownerIds = (process.env.OWNER_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ownerIds.includes(userId);
}

// ---------------------------------------------------------------------------
// GET /api/admin/cr/audit
// Query params: player_id?, edited_by?, since?, until?, limit?, offset?
// Requires: owner session
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  // 1. Auth
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Owner access required." }, { status: 403 });
  }

  // 2. Parse query params
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get("player_id")?.trim() || undefined;
  const editedBy = searchParams.get("edited_by")?.trim() || undefined;
  const sinceRaw = searchParams.get("since");
  const untilRaw = searchParams.get("until");
  const limit = Math.min(Number(searchParams.get("limit") ?? "100"), 500);
  const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

  const since = sinceRaw ? new Date(sinceRaw) : undefined;
  const until = untilRaw ? new Date(untilRaw) : undefined;

  if (since && isNaN(since.getTime())) {
    return NextResponse.json({ error: "Invalid 'since' date." }, { status: 400 });
  }
  if (until && isNaN(until.getTime())) {
    return NextResponse.json({ error: "Invalid 'until' date." }, { status: 400 });
  }

  // 3. Fetch
  try {
    const entries = await getCRAuditLog({ playerId, editedBy, since, until, limit, offset });
    return NextResponse.json({ ok: true, entries, count: entries.length });
  } catch (err) {
    console.error("[admin/cr/audit] Failed:", err);
    return NextResponse.json({ error: "Failed to fetch audit log." }, { status: 500 });
  }
}
