import { NextResponse } from "next/server";
import { listAnnouncements } from "@/lib/announcements";

// ---------------------------------------------------------------------------
// GET /api/announcements/list
// Public endpoint — returns the most recent announcements.
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const announcements = await listAnnouncements(20);
    return NextResponse.json({ announcements });
  } catch (err) {
    console.error("[announcements/list] Error:", err);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
