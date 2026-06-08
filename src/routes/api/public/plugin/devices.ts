import { createFileRoute } from "@tanstack/react-router";
import { corsPreflight, jsonResponse, licenseKeySchema, loadLicense } from "@/lib/plugin-api.server";

export const Route = createFileRoute("/api/public/plugin/devices")({
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
        const { data } = await supabaseAdmin
          .from("devices")
          .select("id, name, status, sim_info")
          .eq("brand_id", lic.brand_id)
          .order("created_at", { ascending: false });

        return jsonResponse({
          ok: true,
          selected_device_id: lic.device_id,
          devices: data ?? [],
        });
      },
    },
  },
});
