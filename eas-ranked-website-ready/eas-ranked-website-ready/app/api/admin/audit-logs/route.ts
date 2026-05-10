import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { DEVELOPER_USER_ID } from "@/lib/premium";
import { getAuditLogs } from "@/lib/admin/audit";

function isDeveloper(userId: string): boolean {
  return userId === DEVELOPER_USER_ID;
}

// ---------------------------------------------------------------------------
// GET /api/admin/audit-logs
//   ?adminId=xxx        — filter by admin who performed the action
//   ?targetUserId=xxx   — filter by the player who was affected
//   ?limit=50           — max results (default 50, max 200)
//   ?offset=0           — pagination offset
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDeveloper(session.userId)) {
    return NextResponse.json(
      { error: "Forbidden. Developer access required." },
      { status: 403 }
    );
  }

  const adminId = req.nextUrl.searchParams.get("adminId") ?? undefined;
  const targetUserId =
    req.nextUrl.searchParams.get("targetUserId") ?? undefined;
  const limit = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("limit") ?? 50), 1),
    200
  );
  const offset = Math.max(
    Number(req.nextUrl.searchParams.get("offset") ?? 0),
    0
  );

  try {
    const logs = await getAuditLogs({ adminId, targetUserId, limit, offset });
    return NextResponse.json({ logs, limit, offset });
  } catch (err) {
    console.error("[api/admin/audit-logs] GET failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
