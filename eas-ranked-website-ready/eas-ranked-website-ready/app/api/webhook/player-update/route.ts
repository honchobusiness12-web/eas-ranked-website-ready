import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getPlayerFromDB, type CachedPlayer } from "@/lib/cache";

export async function POST(req: NextRequest) {
  // ------------------------------------------------------------------
  // 1. Authenticate the request using the shared webhook secret.
  // ------------------------------------------------------------------
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] WEBHOOK_SECRET env var is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const providedSecret = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  if (providedSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ------------------------------------------------------------------
  // 2. Parse the request body.
  // ------------------------------------------------------------------
  let body: { user_id?: string; data?: Partial<CachedPlayer> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const userId = body?.user_id;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json(
      { error: "Missing or invalid user_id" },
      { status: 400 }
    );
  }

  // ------------------------------------------------------------------
  // 3. Validate the updated player against PostgreSQL.
  //    The bot has already written to the DB before calling this webhook,
  //    so we fetch the authoritative record directly from PostgreSQL.
  // ------------------------------------------------------------------
  const dbPlayer = await getPlayerFromDB(userId);
  if (!dbPlayer) {
    return NextResponse.json(
      { error: `Player ${userId} not found in database` },
      { status: 400 }
    );
  }

  // ------------------------------------------------------------------
  // 4. Invalidate all cached pages so Next.js regenerates them on the
  //    next request with fresh data from PostgreSQL.
  // ------------------------------------------------------------------
  revalidatePath("/");

  console.log(
    `[webhook] Revalidated pages for player ${userId} (${dbPlayer.name}) — CR: ${dbPlayer.cr}`
  );

  return NextResponse.json({ ok: true, player: dbPlayer }, { status: 200 });
}
