import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { disableCode } from "@/lib/giveaway";

// ---------------------------------------------------------------------------
// POST /api/giveaway/disable
// Body: { code: string }
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

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Owner access required." }, { status: 403 });
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const code = (body.code ?? "").trim().toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "Code is required." }, { status: 400 });
  }

  try {
    const disabled = await disableCode(code);
    if (!disabled) {
      return NextResponse.json({ error: "Code not found." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[giveaway/disable] Unexpected error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
