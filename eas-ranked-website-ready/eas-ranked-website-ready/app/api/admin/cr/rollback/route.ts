import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rollbackCREdit, rollbackCREditRange, DEVELOPER_USER_ID } from "@/lib/premium";

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
// POST /api/admin/cr/rollback
//
// Single rollback:  { audit_id: string }
// Range rollback:   { since: string (ISO), until: string (ISO) }
//
// Requires: owner session
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // 1. Auth
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isOwner(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Owner access required." }, { status: 403 });
  }

  // 2. Parse body
  let body: { audit_id?: string; since?: string; until?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // 3. Route to single or range rollback
  if (body.audit_id) {
    // ── Single rollback ──────────────────────────────────────────────────────
    const auditId = body.audit_id.trim();
    if (!auditId) {
      return NextResponse.json({ error: "audit_id is required." }, { status: 400 });
    }

    const result = await rollbackCREdit(auditId, session.userId);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, entry: result.entry });
  }

  if (body.since && body.until) {
    // ── Range rollback ───────────────────────────────────────────────────────
    const since = new Date(body.since);
    const until = new Date(body.until);

    if (isNaN(since.getTime())) {
      return NextResponse.json({ error: "Invalid 'since' date." }, { status: 400 });
    }
    if (isNaN(until.getTime())) {
      return NextResponse.json({ error: "Invalid 'until' date." }, { status: 400 });
    }
    if (since >= until) {
      return NextResponse.json(
        { error: "'since' must be earlier than 'until'." },
        { status: 400 }
      );
    }

    const result = await rollbackCREditRange({ since, until, rolledBackBy: session.userId });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, count: result.count });
  }

  return NextResponse.json(
    { error: "Provide either 'audit_id' (single rollback) or 'since' + 'until' (range rollback)." },
    { status: 400 }
  );
}
