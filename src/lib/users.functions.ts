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
      role: z.enum(["owner", "admin", "manager", "support_agent", "member"]),
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

export const impersonateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { data: profile, error: pErr } = await context.supabase
      .from("profiles")
      .select("email")
      .eq("id", data.user_id)
      .single();
    if (pErr || !profile?.email) throw new Error("User not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: profile.email,
    });
    if (error) throw new Error(error.message);
    const action_link = (link as any)?.properties?.action_link ?? (link as any)?.action_link;
    if (!action_link) throw new Error("Could not create login link");
    await context.supabase.from("activity_log").insert({
      user_id: context.userId,
      action: "impersonate",
      details: { target_user_id: data.user_id, target_email: profile.email },
    });
    return { url: action_link as string };
  });

export const createUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      email: z.string().email().max(255),
      password: z.string().min(6).max(72),
      full_name: z.string().min(1).max(100),
      role: z.enum(["owner", "admin", "manager", "support_agent", "member"]).default("member"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error) throw new Error(error.message);
    const uid = created.user?.id;
    if (!uid) throw new Error("User creation failed");
    // handle_new_user trigger seeds default member role; override when a non-member role is requested
    if (data.role !== "member") {
      await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
      await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: data.role });
    }
    return { ok: true, user_id: uid };
  });
