import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { corsPreflight, jsonResponse, licenseKeySchema, loadLicense } from "@/lib/plugin-api.server";

const Body = z.object({ license_key: licenseKeySchema });

export const Route = createFileRoute("/api/public/plugin/heartbeat")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      POST: async ({ request }) => {
        const raw = await request.json().catch(() => null);
        const parsed = Body.safeParse(raw);
        if (!parsed.success) return jsonResponse({ error: "Invalid input" }, 400);

        const lic = await loadLicense(parsed.data.license_key);
        if (!lic) return jsonResponse({ error: "Not found" }, 404);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("plugin_licenses")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", lic.id);

        return jsonResponse({ ok: true, status: lic.status, device_id: lic.device_id });
      },
    },
  },
});
