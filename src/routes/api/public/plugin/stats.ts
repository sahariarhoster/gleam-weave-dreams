import { createFileRoute } from "@tanstack/react-router";
import { corsPreflight, jsonResponse, licenseKeySchema, loadLicense } from "@/lib/plugin-api.server";

export const Route = createFileRoute("/api/public/plugin/stats")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const key = url.searchParams.get("license_key") ?? "";
        const parsed = licenseKeySchema.safeParse(key);
        if (!parsed.success) return jsonResponse({ error: "Invalid license_key" }, 400);

        const lic = await loadLicense(parsed.data);
        if (!lic || lic.status !== "active") return jsonResponse({ error: "License invalid" }, 403);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 7-day series + totals
        const since = new Date();
        since.setDate(since.getDate() - 6);
        since.setHours(0, 0, 0, 0);

        const { data: logs } = await supabaseAdmin
          .from("activity_log")
          .select("created_at, details")
          .eq("brand_id", lic.brand_id)
          .eq("action", "plugin_send")
          .gte("created_at", since.toISOString())
          .order("created_at", { ascending: true });

        const days: { date: string; sent: number; failed: number }[] = [];
        for (let i = 0; i < 7; i++) {
          const d = new Date(since);
          d.setDate(since.getDate() + i);
          days.push({ date: d.toISOString().slice(0, 10), sent: 0, failed: 0 });
        }
        let total = 0, totalFailed = 0, today = 0;
        const todayStr = new Date().toISOString().slice(0, 10);
        (logs ?? []).forEach((r: any) => {
          const day = new Date(r.created_at).toISOString().slice(0, 10);
          const ok = r.details?.status === 200;
          const slot = days.find((x) => x.date === day);
          if (slot) ok ? slot.sent++ : slot.failed++;
          ok ? total++ : totalFailed++;
          if (day === todayStr && ok) today++;
        });

        // Contacts in WordPress group
        const { data: group } = await supabaseAdmin
          .from("contact_groups")
          .select("id")
          .eq("brand_id", lic.brand_id)
          .eq("name", "WordPress")
          .maybeSingle();
        let contacts = 0;
        if (group) {
          const { count } = await supabaseAdmin
            .from("contact_group_members")
            .select("*", { count: "exact", head: true })
            .eq("group_id", group.id);
          contacts = count ?? 0;
        }

        return jsonResponse({
          ok: true,
          totals: { sent: total, failed: totalFailed, today, contacts },
          series: days,
        });
      },
    },
  },
});
