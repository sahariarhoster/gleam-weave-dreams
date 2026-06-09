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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { bdwebs } = await import("@/lib/bdwebs.server");

        // Find owner user_id to compute "all brands" report.
        const { data: ownerRow } = await supabaseAdmin
          .from("user_roles")
          .select("user_id")
          .eq("role", "owner")
          .limit(1)
          .maybeSingle();
        if (!ownerRow) return Response.json({ ok: false, error: "no_owner" });

        // Yesterday range (BD time UTC+6)
        const now = new Date();
        const bdNow = new Date(now.getTime() + 6 * 3600 * 1000);
        const y = new Date(bdNow);
        y.setUTCDate(bdNow.getUTCDate() - 1);
        const dateStr = y.toISOString().slice(0, 10);

        const { data: stats, error } = await supabaseAdmin.rpc("get_report_stats_for_user", {
          _user_id: ownerRow.user_id,
          _start: dateStr,
          _end: dateStr,
          _brand_id: undefined,
        });
        if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

        const s = stats as any;
        const t = s?.totals ?? { sent: 0, failed: 0, total: 0, successRate: 0 };
        const brands = (s?.brands ?? []) as Array<any>;

        const lines: string[] = [];
        lines.push(`📊 Daily Report — ${dateStr}`);
        lines.push("");
        lines.push(`Total SMS Sent: ${t.total}`);
        lines.push(`Today's Success Rate: ${t.successRate}%`);
        lines.push("");
        lines.push("SMS Per Brand:");
        if (brands.length === 0) {
          lines.push("(no activity)");
        } else {
          for (const b of brands) {
            const fr = b.total > 0 ? Math.round((b.failed / b.total) * 1000) / 10 : 0;
            lines.push(`${b.name}: sms ${b.total} | success ${b.successRate}% | failed ${fr}%`);
          }
        }
        const message = lines.join("\n");

        // Load settings for recipient + device
        const { data: settings } = await supabaseAdmin
          .from("system_settings")
          .select("notify_phone, notify_device_id")
          .eq("id", true)
          .maybeSingle();

        if (!settings?.notify_phone || !settings?.notify_device_id) {
          return Response.json({ ok: false, error: "notify_not_configured", message });
        }

        const { data: device } = await supabaseAdmin
          .from("devices")
          .select("device_unique_id, api_secret")
          .eq("id", settings.notify_device_id)
          .maybeSingle();

        if (!device?.api_secret || !device?.device_unique_id) {
          return Response.json({ ok: false, error: "device_not_ready", message });
        }

        const send = await bdwebs.sendWhatsApp({
          secret: device.api_secret,
          account: device.device_unique_id,
          recipient: settings.notify_phone,
          message,
        });

        await supabaseAdmin.from("activity_log").insert({
          action: "daily_report_sent",
          details: { date: dateStr, status: send.status, message_preview: message.slice(0, 200) },
        });

        return Response.json({ ok: true, sent: send.status === 200, gateway: send });
      },
    },
  },
});
