import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { corsPreflight, jsonResponse, licenseKeySchema, loadLicense } from "@/lib/plugin-api.server";

const Body = z.object({
  license_key: licenseKeySchema,
  site_url: z.string().url().max(500).optional(),
});

export const Route = createFileRoute("/api/public/plugin/activate")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      POST: async ({ request }) => {
        const raw = await request.json().catch(() => null);
        const parsed = Body.safeParse(raw);
        if (!parsed.success) return jsonResponse({ error: "Invalid input" }, 400);

        const lic = await loadLicense(parsed.data.license_key);
        if (!lic) return jsonResponse({ error: "License not found" }, 404);
        if (lic.status !== "active") return jsonResponse({ error: "License is " + lic.status }, 403);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("plugin_licenses")
          .update({
            site_url: parsed.data.site_url ?? null,
            activated_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
          })
          .eq("id", lic.id);

        return jsonResponse({
          ok: true,
          brand_id: lic.brand_id,
          brand_name: lic.brands?.name,
          device_id: lic.device_id,
        });
      },
    },
  },
});
