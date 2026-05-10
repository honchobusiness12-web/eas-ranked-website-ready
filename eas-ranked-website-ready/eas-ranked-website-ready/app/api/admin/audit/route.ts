import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { DEVELOPER_USER_ID } from "@/lib/premium";
import { getAuditLogs } from "@/lib/admin/db";

// ---------------------------------------------------------------------------
// GET /api/admin/audit
//   ?limit=20&offset=0   — paginated log
//   ?userId=xxx          — filter to a specific player
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.userId !== DEVELOPER_USER_ID) {
    return NextResponse.json(
      { error: "Forbidden. Developer access required." },
      { status: 403 }
    );
  }

  const limit = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("limit") ?? 20), 1),
    100
  );
  const offset = Math.max(
    Number(req.nextUrl.searchParams.get("offset") ?? 0),
    0
  );
  const userId = req.nextUrl.searchParams.get("userId") ?? undefined;

  try {
    const { logs, total } = await getAuditLogs(limit, offset, userId);
    return NextResponse.json({ logs, total, limit, offset });
  } catch (err) {
    console.error("[api/admin/audit] GET failed:", err);
    return NextResponse.json(
      { error: "Failed to fetch audit log." },
      { status: 500 }
    );
  }
}
