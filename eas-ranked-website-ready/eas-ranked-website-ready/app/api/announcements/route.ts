import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCurrentAnnouncements } from "@/lib/announcements";

// ---------------------------------------------------------------------------
// GET /api/announcements — public endpoint
// Returns non-dismissed announcements for the current user (or all if anon).
// Alias for /api/announcements/current — used by the AnnouncementProvider.
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest) {
  try {
    const session = await getSession();
    const userId = session?.userId;

    const announcements = await getCurrentAnnouncements(userId);
    return NextResponse.json({ announcements });
  } catch (err) {
    console.error("[api/announcements] GET failed:", err);
    return NextResponse.json({ announcements: [] });
  }
}
