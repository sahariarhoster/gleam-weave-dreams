import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertOwner(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: owner only");
}

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.supabase, context.userId);
    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select("id, email, full_name, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const [rolesRes, membersRes] = await Promise.all([
      context.supabase.from("user_roles").select("user_id, role"),
      context.supabase.from("brand_members").select("user_id, role, brand_id, brands(name)"),
    ]);
    const roleMap: Record<string, string[]> = {};
    (rolesRes.data ?? []).forEach((r: any) => {
      roleMap[r.user_id] = [...(roleMap[r.user_id] ?? []), r.role];
    });
    const memberMap: Record<string, any[]> = {};
    (membersRes.data ?? []).forEach((m: any) => {
      memberMap[m.user_id] = [
        ...(memberMap[m.user_id] ?? []),
        { brand_id: m.brand_id, brand_name: m.brands?.name, role: m.role },
      ];
    });
    return (profiles ?? []).map((p) => ({
      ...p,
      roles: roleMap[p.id] ?? [],
      memberships: memberMap[p.id] ?? [],
    }));
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      user_id: z.string().uuid(),
      role: z.enum(["owner", "member"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    // ensure single role per user: delete other, upsert this
    await context.supabase.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await context.supabase
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addBrandMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      user_id: z.string().uuid(),
      brand_id: z.string().uuid(),
      role: z.enum(["brand_admin", "sender"]).default("sender"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("brand_members")
      .upsert({ ...data }, { onConflict: "brand_id,user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeBrandMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      user_id: z.string().uuid(),
      brand_id: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("brand_members")
      .delete()
      .eq("user_id", data.user_id)
      .eq("brand_id", data.brand_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
