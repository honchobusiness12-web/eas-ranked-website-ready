import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCRAuditLogs } from "@/lib/cr-admin";

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
// GET /api/admin/cr/logs
// Query params: playerId? (filter), limit? (default 10), offset? (default 0)
// Requires: authenticated owner session
// Returns paginated CR audit logs.
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  // 1. Require authentication
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // 2. Require owner
  if (!isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Owner access required." }, { status: 403 });
  }

  // 3. Parse query params
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get("playerId")?.trim() || undefined;
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 10), 1), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? 0), 0);

  // 4. Fetch logs
  try {
    const { logs, total } = await getCRAuditLogs(playerId, limit, offset);
    return NextResponse.json({ logs, total, limit, offset });
  } catch (err) {
    console.error("[admin/cr/logs] Failed to fetch audit logs:", err);
    return NextResponse.json({ error: "Failed to fetch audit logs." }, { status: 500 });
  }
}
