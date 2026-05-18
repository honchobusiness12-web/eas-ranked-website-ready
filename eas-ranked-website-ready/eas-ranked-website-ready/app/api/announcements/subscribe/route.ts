import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getCurrentAnnouncements } from "@/lib/announcements";

// ---------------------------------------------------------------------------
// GET /api/announcements/subscribe — Server-Sent Events stream
//
// Streams announcement updates to the client in real-time.
// Polls the DB every 15 seconds and pushes new/changed announcements.
// Falls back gracefully if the client disconnects.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const userId = session?.userId;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      // Helper to send an SSE event
      function send(event: string, data: unknown) {
        if (closed) return;
        try {
          const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          closed = true;
        }
      }

      // Send a heartbeat comment to keep the connection alive
      function heartbeat() {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          closed = true;
        }
      }

      // Initial load — send current announcements immediately
      try {
        const announcements = await getCurrentAnnouncements(userId);
        send("announcements", { announcements });
      } catch {
        send("announcements", { announcements: [] });
      }

      // Poll every 15 seconds for new announcements
      const pollInterval = setInterval(async () => {
        if (closed) {
          clearInterval(pollInterval);
          clearInterval(heartbeatInterval);
          return;
        }
        try {
          const announcements = await getCurrentAnnouncements(userId);
          send("announcements", { announcements });
        } catch {
          // Silently continue — non-critical
        }
      }, 15_000);

      // Heartbeat every 25 seconds to prevent proxy timeouts
      const heartbeatInterval = setInterval(() => {
        if (closed) {
          clearInterval(pollInterval);
          clearInterval(heartbeatInterval);
          return;
        }
        heartbeat();
      }, 25_000);

      // Clean up when the client disconnects
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(pollInterval);
        clearInterval(heartbeatInterval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable Nginx buffering
    },
  });
}
