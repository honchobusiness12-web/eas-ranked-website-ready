import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { DEVELOPER_USER_ID } from "@/lib/premium";

// ---------------------------------------------------------------------------
// GET /api/admin/check
// Returns { isDeveloper: boolean } — never 403.
// Used by admin pages to gate access without a circular dependency on the
// actual admin endpoints (which also require developer access).
// ---------------------------------------------------------------------------

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ isDeveloper: false });
  }

  return NextResponse.json({
    isDeveloper: session.userId === DEVELOPER_USER_ID,
  });
}
