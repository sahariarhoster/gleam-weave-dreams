import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { corsPreflight, jsonResponse, licenseKeySchema, loadLicense } from "@/lib/plugin-api.server";

const Body = z.object({
  license_key: licenseKeySchema,
  recipient: z.string().min(5).max(20),
  message: z.string().min(1).max(4000),
});

export const Route = createFileRoute("/api/public/plugin/send")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      POST: async ({ request }) => {
        const raw = await request.json().catch(() => null);
        const parsed = Body.safeParse(raw);
        if (!parsed.success) return jsonResponse({ error: "Invalid input" }, 400);

        const lic = await loadLicense(parsed.data.license_key);
        if (!lic || lic.status !== "active") return jsonResponse({ error: "License invalid" }, 403);
        if (!lic.device_id) return jsonResponse({ error: "No device selected for this license" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: device, error } = await supabaseAdmin
          .from("devices")
          .select("api_secret, device_unique_id, brand_id")
          .eq("id", lic.device_id)
          .maybeSingle();
        if (error || !device) return jsonResponse({ error: "Device not found" }, 404);

        let recipient = parsed.data.recipient.trim();
        if (!recipient.startsWith("+")) recipient = "+880" + recipient.replace(/^0+/, "");

        const { bdwebs } = await import("@/lib/bdwebs.server");
        const res = await bdwebs.sendWhatsApp({
          secret: device.api_secret,
          account: device.device_unique_id,
          recipient,
          message: parsed.data.message,
        });

        await supabaseAdmin.from("activity_log").insert({
          brand_id: device.brand_id ?? null,
          action: "plugin_send",
          details: { recipient, status: res.status, message: res.message, license_id: lic.id },
        });
        await supabaseAdmin
          .from("plugin_licenses")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", lic.id);

        if (res.status !== 200) return jsonResponse({ error: res.message || "Send failed" }, 502);
        return jsonResponse({ ok: true, message: res.message });
      },
    },
  },
});
