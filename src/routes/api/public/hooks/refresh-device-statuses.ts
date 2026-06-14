import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/refresh-device-statuses")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { bdwebs } = await import("@/lib/bdwebs.server");

        const { data: rows, error } = await supabaseAdmin
          .from("devices")
          .select("id, api_secret, device_unique_id");
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const bySecret = new Map<string, Array<{ id: string; device_unique_id: string }>>();
        for (const r of rows ?? []) {
          if (!r.api_secret || !r.device_unique_id) continue;
          const list = bySecret.get(r.api_secret) ?? [];
          list.push({ id: r.id, device_unique_id: r.device_unique_id });
          bySecret.set(r.api_secret, list);
        }

        let updated = 0;
        const nowIso = new Date().toISOString();
        for (const [secret, group] of bySecret) {
          let accounts: any[] = [];
          try {
            const res = await bdwebs.getWhatsAppAccounts(secret);
            accounts = Array.isArray(res.data) ? res.data : [];
          } catch (e) {
            console.warn("cron getWhatsAppAccounts failed", e);
            continue;
          }
          for (const dev of group) {
            let acc = accounts.find((a: any) =>
              a.unique === dev.device_unique_id ||
              a.account === dev.device_unique_id ||
              a.device_unique_id === dev.device_unique_id,
            );
            if (!acc && accounts.length === 1) acc = accounts[0];
            const rawStatus = String(acc?.status ?? "").toLowerCase();
            const status = !acc
              ? "disconnected"
              : rawStatus === "1" || rawStatus === "active" || rawStatus === "connected"
                ? "active"
                : "disconnected";
            const patch: { status: "active" | "disconnected"; last_checked_at: string; device_unique_id?: string } = {
              status,
              last_checked_at: nowIso,
            };
            const panelUnique = acc?.unique ?? acc?.account ?? acc?.device_unique_id;
            if (panelUnique && panelUnique !== dev.device_unique_id) {
              patch.device_unique_id = String(panelUnique);
            }
            await supabaseAdmin.from("devices").update(patch).eq("id", dev.id);
            updated++;
          }
        }

        return Response.json({ success: true, updated, timestamp: nowIso });
      },
    },
  },
});
