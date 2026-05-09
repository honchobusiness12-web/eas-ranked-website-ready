import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getPlayerFromDB, type CachedPlayer } from "@/lib/cache";
import { invalidatePremiumStatusCache } from "@/lib/premium";

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
  // 3. The bot is responsible for writing player data to the DB
  //    (players table has a composite PK of guild_id + user_id, so the
  //    bot must supply both columns). We skip any upsert here and just
  //    treat this webhook as a cache-bust signal.
  // ------------------------------------------------------------------

  // ------------------------------------------------------------------
  // 4. Fetch the authoritative record from PostgreSQL so we can log it
  //    and return it to the caller.
  // ------------------------------------------------------------------
  const dbPlayer = await getPlayerFromDB(userId);
  if (!dbPlayer) {
    // Player not in DB yet — still return 200 so the bot isn't retried.
    console.warn(`[webhook] Player ${userId} not found in DB (bot may not have written yet)`);
    return NextResponse.json({ ok: true, player: null }, { status: 200 });
  }

  // ------------------------------------------------------------------
  // 5. Invalidate the in-process premium/badge status cache so the next
  //    request reflects any role or subscription changes the bot sent.
  // ------------------------------------------------------------------
  invalidatePremiumStatusCache(userId);

  // ------------------------------------------------------------------
  // 6. Invalidate all cached Next.js pages so they regenerate with fresh
  //    data from PostgreSQL on the next request.
  // ------------------------------------------------------------------
  revalidatePath("/");

  console.log(
    `[webhook] Processed update for player ${userId} (${dbPlayer.name}) — CR: ${dbPlayer.cr}`
  );

  return NextResponse.json({ ok: true, player: dbPlayer }, { status: 200 });
}
