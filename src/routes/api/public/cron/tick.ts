import { createFileRoute } from "@tanstack/react-router";

// Cron tick: processes scheduled + running campaigns in small batches.
// Called every minute by pg_cron.
export const Route = createFileRoute("/api/public/cron/tick")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const nowIso = new Date().toISOString();

        // 1) Promote due scheduled campaigns -> running
        await supabaseAdmin
          .from("campaigns")
          .update({ status: "running", started_at: nowIso })
          .eq("status", "scheduled")
          .lte("scheduled_at", nowIso);

        // 2) Pick active running campaigns
        const { data: running } = await supabaseAdmin
          .from("campaigns")
          .select("id")
          .eq("status", "running")
          .limit(10);

        const results: any[] = [];

        for (const camp of running ?? []) {
          // load campaign details
          const { data: c } = await supabaseAdmin
            .from("campaigns")
            .select("id, device_id, min_delay_seconds, max_delay_seconds, daily_limit, send_window_start, send_window_end, sent_count, failed_count")
            .eq("id", camp.id)
            .single();
          if (!c) continue;

          // check window (BD time approx UTC+6)
          const now = new Date();
          const bdMin = ((now.getUTCHours() * 60 + now.getUTCMinutes()) + 360) % 1440;
          const [sh, sm] = (c.send_window_start ?? "09:00").split(":").map(Number);
          const [eh, em] = (c.send_window_end ?? "21:00").split(":").map(Number);
          const startMin = sh * 60 + sm;
          const endMin = eh * 60 + em;
          const inWindow = startMin <= endMin
            ? bdMin >= startMin && bdMin < endMin
            : bdMin >= startMin || bdMin < endMin;
          if (!inWindow) { results.push({ id: c.id, skipped: "outside_window" }); continue; }

          // daily limit check
          const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
          const { count: sentToday } = await supabaseAdmin
            .from("campaign_messages")
            .select("*", { count: "exact", head: true })
            .eq("campaign_id", c.id)
            .eq("status", "sent")
            .gte("sent_at", startOfDay.toISOString());
          const remaining = (c.daily_limit ?? 500) - (sentToday ?? 0);
          if (remaining <= 0) { results.push({ id: c.id, skipped: "daily_limit" }); continue; }

          const { data: device } = await supabaseAdmin
            .from("devices")
            .select("api_secret, device_unique_id")
            .eq("id", c.device_id)
            .single();
          if (!device) continue;

          // take a small batch (cron tick has a few seconds budget)
          const take = Math.min(8, remaining);
          const { data: queued } = await supabaseAdmin
            .from("campaign_messages")
            .select("id, phone, rendered_message")
            .eq("campaign_id", c.id)
            .eq("status", "queued")
            .order("created_at", { ascending: true })
            .limit(take);
          const batch = queued ?? [];

          if (batch.length === 0) {
            await supabaseAdmin.from("campaigns").update({
              status: "completed", completed_at: new Date().toISOString(),
            }).eq("id", c.id);
            results.push({ id: c.id, completed: true });
            continue;
          }

          const { bdwebs } = await import("@/lib/bdwebs.server");

          let sent = 0;
          let failed = 0;
          for (let i = 0; i < batch.length; i++) {
            const m = batch[i];
            let recipient = m.phone.trim();
            if (!recipient.startsWith("+")) recipient = "+880" + recipient.replace(/^0+/, "");
            try {
              const res = await bdwebs.sendWhatsApp({
                secret: device.api_secret,
                account: device.device_unique_id,
                recipient,
                message: m.rendered_message,
              });
              if (res.status === 200) {
                sent++;
                await supabaseAdmin.from("campaign_messages").update({
                  status: "sent", sent_at: new Date().toISOString(), gateway_response: res as any,
                }).eq("id", m.id);
              } else {
                failed++;
                await supabaseAdmin.from("campaign_messages").update({
                  status: "failed", error_message: res.message, gateway_response: res as any,
                }).eq("id", m.id);
              }
            } catch (e) {
              failed++;
              await supabaseAdmin.from("campaign_messages").update({
                status: "failed", error_message: (e as Error).message,
              }).eq("id", m.id);
            }
            if (i < batch.length - 1) {
              const min = c.min_delay_seconds ?? 5;
              const max = c.max_delay_seconds ?? 15;
              const delay = (min + Math.random() * Math.max(0, max - min)) * 1000;
              await new Promise((r) => setTimeout(r, Math.min(delay, 8000)));
            }
          }

          const newSent = (c.sent_count ?? 0) + sent;
          const newFailed = (c.failed_count ?? 0) + failed;
          const total = newSent + newFailed;
          const failRate = total > 0 ? newFailed / total : 0;
          const patch: Record<string, any> = { sent_count: newSent, failed_count: newFailed };
          if (total >= 20 && failRate > 0.2) patch.status = "paused";
          await supabaseAdmin.from("campaigns").update(patch).eq("id", c.id);
          results.push({ id: c.id, sent, failed, paused: patch.status === "paused" });
        }

        return Response.json({ ok: true, processed: results.length, results });
      },
    },
  },
});
