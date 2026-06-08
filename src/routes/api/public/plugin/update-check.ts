import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { corsPreflight, jsonResponse, licenseKeySchema, loadLicense } from "@/lib/plugin-api.server";

const Body = z.object({
  license_key: licenseKeySchema,
  current_version: z.string().max(20).optional(),
});

export const Route = createFileRoute("/api/public/plugin/update-check")({
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
        const { data: s } = await supabaseAdmin
          .from("system_settings")
          .select("plugin_version, plugin_download_url, plugin_changelog, plugin_tested_wp, plugin_requires_wp, plugin_requires_php, updated_at")
          .eq("id", true)
          .maybeSingle();

        const origin = new URL(request.url).origin;
        const download = s?.plugin_download_url || `${origin}/wa-notifier-woocommerce.zip`;

        return jsonResponse({
          slug: "wa-notifier-woocommerce",
          name: "WA Suite for WooCommerce",
          version: s?.plugin_version ?? "1.0.0",
          download_url: download,
          changelog: s?.plugin_changelog ?? "",
          tested: s?.plugin_tested_wp ?? "",
          requires: s?.plugin_requires_wp ?? "",
          requires_php: s?.plugin_requires_php ?? "",
          last_updated: s?.updated_at ?? null,
        });
      },
    },
  },
});
