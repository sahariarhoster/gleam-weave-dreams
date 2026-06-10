// Shared helpers for /api/public/plugin/* routes
import { z } from "zod";

export const licenseKeySchema = z.string().regex(/^(HS|WAN)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export function corsPreflight() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function loadLicense(key: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("plugin_licenses")
    .select("id, brand_id, status, device_id, brands(name, status)")
    .eq("license_key", key)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const lic: any = data;
  const brandStatus = lic.brands?.status;
  // If the brand subscription isn't active, treat the license as inactive
  if (brandStatus && brandStatus !== "active") {
    lic.status = brandStatus === "on_hold" ? "on_hold" : "suspended";
  }
  return lic;
}
