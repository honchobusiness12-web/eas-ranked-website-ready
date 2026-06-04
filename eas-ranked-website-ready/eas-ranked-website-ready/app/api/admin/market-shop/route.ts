import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { DEVELOPER_USER_ID } from "@/lib/premium";
import { getShopItems, createShopItem } from "@/lib/market-shop";

// ---------------------------------------------------------------------------
// Developer-only guard
// ---------------------------------------------------------------------------

function isDeveloper(userId: string): boolean {
  return userId === DEVELOPER_USER_ID;
}

// ---------------------------------------------------------------------------
// GET /api/admin/market-shop
// Returns all shop items for the main guild with optional filters.
// Query params: active, disabled, limited, sold_out, type, rarity, search
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDeveloper(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Developer access required." }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;

  try {
    const items = await getShopItems({
      active:   sp.get("active")   === "true" ? true  : undefined,
      disabled: sp.get("disabled") === "true" ? true  : undefined,
      limited:  sp.get("limited")  === "true" ? true  : undefined,
      sold_out: sp.get("sold_out") === "true" ? true  : undefined,
      type:     sp.get("type")     ?? undefined,
      rarity:   sp.get("rarity")   ?? undefined,
      search:   sp.get("search")   ?? undefined,
    });
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[api/admin/market-shop] GET failed:", err);
    return NextResponse.json({ error: "Failed to fetch shop items" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/admin/market-shop/create  (handled here as POST /)
// Body: { item_id, name, description, type, rarity, badge_id, role_id,
//         max_stock, base_value, min_value, max_value, resale_percent, is_limited }
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDeveloper(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Developer access required." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { item_id, name, type } = body;

  if (!item_id || typeof item_id !== "string" || !item_id.trim()) {
    return NextResponse.json({ error: "item_id is required" }, { status: 400 });
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  if (!type || typeof type !== "string") {
    return NextResponse.json({ error: "type is required" }, { status: 400 });
  }

  const VALID_TYPES = ["badge", "title", "cosmetic", "trophy", "role"];
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const item = await createShopItem({
      item_id:        item_id.trim(),
      name:           (name as string).trim(),
      description:    typeof body.description === "string" ? body.description.trim() : undefined,
      type,
      rarity:         typeof body.rarity === "string" ? body.rarity : undefined,
      badge_id:       typeof body.badge_id === "string" ? body.badge_id.trim() : undefined,
      role_id:        typeof body.role_id === "string" ? body.role_id.trim() : undefined,
      max_stock:      typeof body.max_stock === "number" ? body.max_stock : undefined,
      base_value:     typeof body.base_value === "number" ? body.base_value : undefined,
      min_value:      typeof body.min_value === "number" ? body.min_value : undefined,
      max_value:      typeof body.max_value === "number" ? body.max_value : undefined,
      resale_percent: typeof body.resale_percent === "number" ? body.resale_percent : undefined,
      is_limited:     typeof body.is_limited === "boolean" ? body.is_limited : undefined,
    });
    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (err: unknown) {
    console.error("[api/admin/market-shop] POST failed:", err);
    // Unique constraint violation
    if (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505") {
      return NextResponse.json({ error: "An item with that item_id already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create shop item" }, { status: 500 });
  }
}
