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

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => r.role as string);
  });


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
      role: z.enum(["owner", "admin", "manager", "brand_owner", "support_agent", "sales_agent", "member"]),
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

async function assertOwnerOrBrandOwner(supabase: any, userId: string, brandId: string) {
  const { data: ownerRow } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "owner").maybeSingle();
  if (ownerRow) return;
  const { data: brand } = await supabase
    .from("brands").select("created_by").eq("id", brandId).maybeSingle();
  if (brand?.created_by === userId) return;
  throw new Error("Forbidden: only the workspace owner or this brand's owner can manage members");
}

export const addBrandMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      user_id: z.string().uuid(),
      brand_id: z.string().uuid(),
      role: z.enum(["brand_admin", "brand_member", "sender"]).default("brand_member"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwnerOrBrandOwner(context.supabase, context.userId, data.brand_id);
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
      role: z.enum(["owner", "admin", "manager", "brand_owner", "support_agent", "sales_agent", "member"]).default("brand_owner"),
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
    const { error: profileErr } = await supabaseAdmin.from("profiles").upsert(
      {
        id: uid,
        email: data.email,
        full_name: data.full_name,
      },
      { onConflict: "id" },
    );
    if (profileErr) throw new Error(profileErr.message);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: data.role });
    if (roleErr) throw new Error(roleErr.message);
    return { ok: true, user_id: uid };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      user_id: z.string().uuid(),
      password: z.string().min(6).max(72),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    await context.supabase.from("activity_log").insert({
      user_id: context.userId,
      action: "reset_password",
      details: { target_user_id: data.user_id },
    });
    return { ok: true };
  });

// ============ Brand-owner: manage members of own brands ============

async function isOwner(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();
  return !!data;
}

async function isBrandOwnerRole(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "brand_owner")
    .maybeSingle();
  return !!data;
}

async function getMyBrandIds(supabase: any, userId: string): Promise<string[]> {
  if (await isOwner(supabase, userId)) {
    const { data } = await supabase.from("brands").select("id");
    return (data ?? []).map((b: any) => b.id as string);
  }
  const includeAssignedBrands = await isBrandOwnerRole(supabase, userId);
  const [ownedRes, memberRes] = await Promise.all([
    supabase.from("brands").select("id").eq("created_by", userId),
    includeAssignedBrands
      ? supabase.from("brand_members").select("brand_id").eq("user_id", userId)
      : Promise.resolve({ data: [] }),
  ]);
  return Array.from(
    new Set([
      ...(ownedRes.data ?? []).map((b: any) => b.id as string),
      ...(memberRes.data ?? []).map((m: any) => m.brand_id as string),
    ]),
  );
}

export const listMyBrandMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ids = await getMyBrandIds(context.supabase, context.userId);
    if (ids.length === 0) return { brands: [], members: [] };
    const [brandsRes, membersRes] = await Promise.all([
      context.supabase.from("brands").select("id, name").in("id", ids),
      context.supabase
        .from("brand_members")
        .select("user_id, role, brand_id, brands(name)")
        .in("brand_id", ids),
    ]);
    const memberRows = membersRes.data ?? [];
    const userIds = Array.from(new Set(memberRows.map((m: any) => m.user_id)));
    let profileMap: Record<string, { email?: string; full_name?: string }> = {};
    if (userIds.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      (profiles ?? []).forEach((p: any) => {
        profileMap[p.id] = { email: p.email, full_name: p.full_name };
      });
    }
    // Fetch banned status from auth admin
    const { supabaseAdmin: admin2 } = await import("@/integrations/supabase/client.server");
    const bannedMap: Record<string, boolean> = {};
    await Promise.all(
      userIds.map(async (uid) => {
        try {
          const { data } = await admin2.auth.admin.getUserById(uid);
          const bu = (data?.user as any)?.banned_until;
          bannedMap[uid] = !!bu && new Date(bu).getTime() > Date.now();
        } catch { bannedMap[uid] = false; }
      }),
    );
    return {
      brands: brandsRes.data ?? [],
      members: memberRows.map((m: any) => ({
        user_id: m.user_id,
        brand_id: m.brand_id,
        brand_name: m.brands?.name,
        role: m.role,
        email: profileMap[m.user_id]?.email,
        full_name: profileMap[m.user_id]?.full_name,
        inactive: bannedMap[m.user_id] ?? false,
      })),
    };
  });

export const createBrandMemberUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      email: z.string().email().max(255),
      password: z.string().min(6).max(72),
      full_name: z.string().min(1).max(100),
      brand_id: z.string().uuid(),
      role: z.enum(["brand_admin", "brand_member", "sender"]).default("brand_member"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const ids = await getMyBrandIds(context.supabase, context.userId);
    if (!ids.includes(data.brand_id)) throw new Error("Forbidden: not your brand");
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
    // Force role to plain 'member' (override trigger's brand_owner default)
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "member" });
    await supabaseAdmin.from("brand_members").insert({
      user_id: uid, brand_id: data.brand_id, role: data.role,
    });
    return { ok: true, user_id: uid };
  });

export const removeMyBrandMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), brand_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const ids = await getMyBrandIds(context.supabase, context.userId);
    if (!ids.includes(data.brand_id)) throw new Error("Forbidden: not your brand");
    const { error } = await context.supabase
      .from("brand_members")
      .delete()
      .eq("user_id", data.user_id)
      .eq("brand_id", data.brand_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setMyBrandMemberActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      user_id: z.string().uuid(),
      brand_id: z.string().uuid(),
      inactive: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const ids = await getMyBrandIds(context.supabase, context.userId);
    if (!ids.includes(data.brand_id)) throw new Error("Forbidden: not your brand");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: data.inactive ? "876000h" : "none",
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteMyBrandMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), brand_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const ids = await getMyBrandIds(context.supabase, context.userId);
    if (!ids.includes(data.brand_id)) throw new Error("Forbidden: not your brand");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Safety: don't delete an owner-role user
    const { data: roles } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", data.user_id);
    if ((roles ?? []).some((r: any) => r.role === "owner")) {
      throw new Error("Cannot delete an owner account");
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
