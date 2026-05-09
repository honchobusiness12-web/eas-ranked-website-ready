import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// GET /api/cron/cr-backup
//
// Daily cron job — runs at 02:00 UTC.
// Triggers a CR snapshot backup by calling the backup API internally.
// Authenticates via CRON_SECRET header to prevent unauthorized calls.
//
// Set up a daily cron that calls:
//   GET https://your-domain.com/api/cron/cr-backup
//   Authorization: Bearer <CRON_SECRET>
//
// Railway cron schedule: 0 2 * * *
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const authHeader = req.headers.get("authorization") ?? "";
    const provided = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader;
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ??
      (req.headers.get("x-forwarded-host")
        ? `https://${req.headers.get("x-forwarded-host")}`
        : `http://localhost:${process.env.PORT ?? 3000}`);

    const backupRes = await fetch(`${baseUrl}/api/admin/cr/backup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret ?? ""}`,
      },
    });

    if (!backupRes.ok) {
      const body = await backupRes.text();
      console.error("[cron/cr-backup] Backup API returned error:", body);
      return NextResponse.json({ error: "Backup API failed.", detail: body }, { status: 500 });
    }

    const data = await backupRes.json();
    console.log(
      `[cron/cr-backup] Backup created — id: ${data.backup_id}, players: ${data.player_count}`
    );

    return NextResponse.json({
      ok: true,
      backup_id: data.backup_id,
      player_count: data.player_count,
      created_at: data.created_at,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/cr-backup] Unexpected error:", err);
    return NextResponse.json({ error: "Cron job failed." }, { status: 500 });
  }
}
