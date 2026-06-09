import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "node:crypto";

// Daily WhatsApp report: sends yesterday's stats to the configured notify_phone via notify_device.
// Triggered by pg_cron once per day.
export const Route = createFileRoute("/api/public/cron/daily-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.CRON_SECRET;
        if (expected) {
          const provided = request.headers.get("x-cron-secret");
          const enc = new TextEncoder();
          const a = enc.encode(provided ?? "");
          const b = enc.encode(expected);
          if (!provided || a.length !== b.length || !timingSafeEqual(a, b)) {
            return new Response("Forbidden", { status: 403 });
          }
        }

        const { runDailyReport } = await import("@/lib/daily-report.server");
        const result = await runDailyReport();
        return Response.json(result, { status: result.ok ? 200 : 500 });
      },
    },
  },
});
