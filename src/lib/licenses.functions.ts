import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function genKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const group = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `HS-${group()}-${group()}-${group()}-${group()}`;
}

async function isOwner(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "owner").maybeSingle();
  return !!data;
}

async function isElevated(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).in("role", ["owner", "support_agent"]);
  return (data ?? []).length > 0;
}

export const listMyLicenses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("plugin_licenses")
      .select("id, brand_id, license_key, status, device_id, site_url, activated_at, last_seen_at, created_at, brands(name, license_limit), devices(name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      ...r,
      brand_name: r.brands?.name,
      brand_license_limit: r.brands?.license_limit,
      device_name: r.devices?.name,
    }));
  });

export const setBrandLicenseLimit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ brand_id: z.string().uuid(), limit: z.number().int().min(1).max(1000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isElevated(context.supabase, context.userId))) throw new Error("Owner only");
    const { error } = await context.supabase
      .from("brands")
      .update({ license_limit: data.limit })
      .eq("id", data.brand_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ brand_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: brand, error: bErr } = await context.supabase
      .from("brands").select("id, created_by, license_limit").eq("id", data.brand_id).maybeSingle();
    if (bErr || !brand) throw new Error("Brand not found");
    const owner = await isOwner(context.supabase, context.userId);
    if (!owner && brand.created_by !== context.userId) throw new Error("Only the brand owner can generate licenses");

    const limit = brand.license_limit ?? 1;
    const { count } = await context.supabase
      .from("plugin_licenses").select("*", { count: "exact", head: true })
      .eq("brand_id", data.brand_id).eq("status", "active");
    if ((count ?? 0) >= limit) {
      throw new Error(`Limit reached: ${limit} active license(s) per brand`);
    }

    const key = genKey();
    const { data: row, error } = await context.supabase
      .from("plugin_licenses")
      .insert({ brand_id: data.brand_id, license_key: key, status: "active", created_by: context.userId })
      .select().single();
    if (error) throw new Error(error.message);
    return row;
  });

async function assertLicenseManager(supabase: any, userId: string, licenseId: string) {
  const { data: lic } = await supabase
    .from("plugin_licenses").select("brand_id").eq("id", licenseId).maybeSingle();
  if (!lic) throw new Error("License not found");
  if (await isOwner(supabase, userId)) return;
  const { data: brand } = await supabase
    .from("brands").select("created_by").eq("id", lic.brand_id).maybeSingle();
  if (brand?.created_by !== userId) throw new Error("Forbidden: not your license");
}

export const revokeLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertLicenseManager(context.supabase, context.userId, data.id);
    const { error } = await context.supabase
      .from("plugin_licenses").update({ status: "revoked" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLicense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertLicenseManager(context.supabase, context.userId, data.id);
    const { error } = await context.supabase
      .from("plugin_licenses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
