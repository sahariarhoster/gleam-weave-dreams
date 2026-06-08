import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { corsPreflight, jsonResponse, licenseKeySchema, loadLicense } from "@/lib/plugin-api.server";

const Body = z.object({
  license_key: licenseKeySchema,
  device_id: z.string().uuid(),
});

export const Route = createFileRoute("/api/public/plugin/select-device")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      POST: async ({ request }) => {
        const raw = await request.json().catch(() => null);
        const parsed = Body.safeParse(raw);
        if (!parsed.success) return jsonResponse({ error: "Invalid input" }, 400);

        const lic = await loadLicense(parsed.data.license_key);
        if (!lic || lic.status !== "active") return jsonResponse({ error: "License invalid" }, 403);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: device } = await supabaseAdmin
          .from("devices").select("id").eq("id", parsed.data.device_id).eq("brand_id", lic.brand_id).maybeSingle();
        if (!device) return jsonResponse({ error: "Device not in your brand" }, 403);

        await supabaseAdmin
          .from("plugin_licenses")
          .update({ device_id: parsed.data.device_id })
          .eq("id", lic.id);

        return jsonResponse({ ok: true });
      },
    },
  },
});
