import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";
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
  // 3. If the bot sent player data in the body, upsert it into the DB.
  //    This allows the webhook to act as both a write and a cache-bust.
  // ------------------------------------------------------------------
  if (body.data && typeof body.data === "object") {
    try {
      await pool.query(
        `INSERT INTO players (user_id, data)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (user_id) DO UPDATE
           SET data = players.data || EXCLUDED.data`,
        [userId, JSON.stringify(body.data)]
      );
      console.log(`[webhook] Upserted player data for ${userId}`);
    } catch (err) {
      console.error(`[webhook] Failed to upsert player ${userId}:`, err);
      return NextResponse.json(
        { error: "Failed to update player record" },
        { status: 500 }
      );
    }
  }

  // ------------------------------------------------------------------
  // 4. Fetch the authoritative record from PostgreSQL so we can log it
  //    and return it to the caller.
  // ------------------------------------------------------------------
  const dbPlayer = await getPlayerFromDB(userId);
  if (!dbPlayer) {
    return NextResponse.json(
      { error: `Player ${userId} not found in database` },
      { status: 404 }
    );
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
