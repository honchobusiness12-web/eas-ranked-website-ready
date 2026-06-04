import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { DEVELOPER_USER_ID } from "@/lib/premium";
import { getShopItem, updateShopItem } from "@/lib/market-shop";

function isDeveloper(userId: string): boolean {
  return userId === DEVELOPER_USER_ID;
}

// ---------------------------------------------------------------------------
// GET /api/admin/market-shop/[id]
// ---------------------------------------------------------------------------

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDeveloper(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Developer access required." }, { status: 403 });
  }

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  try {
    const item = await getShopItem(numId);
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (err) {
    console.error("[api/admin/market-shop/[id]] GET failed:", err);
    return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/admin/market-shop/[id]
// Body: { name, description, type, rarity, badge_id, role_id, current_stock,
//         max_stock, current_value, min_value, max_value, resale_percent,
//         is_limited, is_active, is_sold_out }
// ---------------------------------------------------------------------------

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDeveloper(session.userId)) {
    return NextResponse.json({ error: "Forbidden. Developer access required." }, { status: 403 });
  }

  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const item = await updateShopItem(numId, {
      name:           typeof body.name === "string" ? body.name.trim() : undefined,
      description:    typeof body.description === "string" ? body.description.trim() : undefined,
      type:           typeof body.type === "string" ? body.type : undefined,
      rarity:         typeof body.rarity === "string" ? body.rarity : undefined,
      badge_id:       typeof body.badge_id === "string" ? body.badge_id.trim() : undefined,
      role_id:        typeof body.role_id === "string" ? body.role_id.trim() : undefined,
      current_stock:  typeof body.current_stock === "number" ? body.current_stock : undefined,
      max_stock:      typeof body.max_stock === "number" ? body.max_stock : undefined,
      current_value:  typeof body.current_value === "number" ? body.current_value : undefined,
      min_value:      typeof body.min_value === "number" ? body.min_value : undefined,
      max_value:      typeof body.max_value === "number" ? body.max_value : undefined,
      resale_percent: typeof body.resale_percent === "number" ? body.resale_percent : undefined,
      is_limited:     typeof body.is_limited === "boolean" ? body.is_limited : undefined,
      is_active:      typeof body.is_active === "boolean" ? body.is_active : undefined,
      is_sold_out:    typeof body.is_sold_out === "boolean" ? body.is_sold_out : undefined,
    });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });
    return NextResponse.json({ success: true, item });
  } catch (err) {
    console.error("[api/admin/market-shop/[id]] PATCH failed:", err);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}
