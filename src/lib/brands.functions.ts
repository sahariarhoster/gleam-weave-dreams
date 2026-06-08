import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listBrandsLite = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("brands")
      .select("id, name, license_limit")
      .order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listBrands = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("brands")
      .select("id, name, status, expires_at, message_limit, device_limit, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const ids = (data ?? []).map((b) => b.id);
    if (ids.length === 0) return [];
    const [devicesRes, membersRes] = await Promise.all([
      context.supabase.from("devices").select("brand_id").in("brand_id", ids),
      context.supabase.from("brand_members").select("brand_id").in("brand_id", ids),
    ]);
    const deviceCount: Record<string, number> = {};
    (devicesRes.data ?? []).forEach((r) => {
      if (r.brand_id) deviceCount[r.brand_id] = (deviceCount[r.brand_id] ?? 0) + 1;
    });
    const memberCount: Record<string, number> = {};
    (membersRes.data ?? []).forEach((r) => {
      memberCount[r.brand_id] = (memberCount[r.brand_id] ?? 0) + 1;
    });
    return (data ?? []).map((b) => ({
      ...b,
      devices_count: deviceCount[b.id] ?? 0,
      members_count: memberCount[b.id] ?? 0,
    }));
  });

const brandInput = z.object({
  name: z.string().min(1).max(100),
  status: z.enum(["active", "suspended", "expired"]).default("active"),
  expires_at: z.string().nullable().optional(),
  message_limit: z.number().int().nonnegative().nullable().optional(),
  device_limit: z.number().int().nonnegative().default(1),
});

export const createBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => brandInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("brands")
      .insert({ ...data, created_by: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    // auto-add creator as brand_admin
    await context.supabase
      .from("brand_members")
      .insert({ brand_id: row.id, user_id: context.userId, role: "brand_admin" });
    return row;
  });

async function assertBrandManager(supabase: any, userId: string, brandId: string) {
  const { data: roleRow } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "owner").maybeSingle();
  if (roleRow) return;
  const { data: brand } = await supabase
    .from("brands").select("created_by").eq("id", brandId).maybeSingle();
  if (!brand) throw new Error("Brand not found");
  if (brand.created_by !== userId) throw new Error("Forbidden: not your brand");
}

export const updateBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => brandInput.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    await assertBrandManager(context.supabase, context.userId, id);
    const { error } = await context.supabase.from("brands").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteBrand = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertBrandManager(context.supabase, context.userId, data.id);
    const { error } = await context.supabase.from("brands").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
