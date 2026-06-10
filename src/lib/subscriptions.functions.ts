import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MANAGE_ROLES = ["owner", "support_agent", "sales_agent"] as const;

async function assertManageRole(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", MANAGE_ROLES as unknown as string[]);
  if (!data || data.length === 0) throw new Error("Forbidden: management role required");
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** Owner / support / sales — list every brand as a subscription. */
export const listAllSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertManageRole(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("brands")
      .select(
        "id, name, status, expires_at, message_limit, device_limit, license_limit, created_by, created_at, cancel_requested_at, current_package_id, packages:current_package_id(id, name, duration_days, price)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    // Hydrate owner profile (email/full_name)
    const ownerIds = Array.from(new Set((data ?? []).map((r: any) => r.created_by).filter(Boolean)));
    let profiles: Record<string, { email: string | null; full_name: string | null }> = {};
    if (ownerIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles").select("id, email, full_name").in("id", ownerIds);
      profiles = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p]));
    }

    return (data ?? []).map((r: any) => ({
      id: r.id,
      brand_name: r.name,
      status: r.status,
      expires_at: r.expires_at,
      days_left: daysUntil(r.expires_at),
      cancel_requested_at: r.cancel_requested_at,
      package: r.packages ? { id: r.packages.id, name: r.packages.name, duration_days: r.packages.duration_days, price: r.packages.price } : null,
      owner: {
        id: r.created_by,
        email: profiles[r.created_by]?.email ?? null,
        full_name: profiles[r.created_by]?.full_name ?? null,
      },
      limits: {
        messages: r.message_limit,
        devices: r.device_limit,
        licenses: r.license_limit,
      },
    }));
  });

/** Brand owner / member — list subscriptions they have access to. */
export const listMySubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("brands")
      .select(
        "id, name, status, expires_at, message_limit, device_limit, license_limit, created_by, created_at, cancel_requested_at, current_package_id, packages:current_package_id(id, name, duration_days, price)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      brand_name: r.name,
      status: r.status,
      expires_at: r.expires_at,
      days_left: daysUntil(r.expires_at),
      cancel_requested_at: r.cancel_requested_at,
      is_owner: r.created_by === context.userId,
      package: r.packages ? { id: r.packages.id, name: r.packages.name, duration_days: r.packages.duration_days, price: r.packages.price } : null,
      limits: { messages: r.message_limit, devices: r.device_limit, licenses: r.license_limit },
    }));
  });

/** Owner / support / sales — admin action on a subscription. */
export const adminUpdateSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      brand_id: z.string().uuid(),
      action: z.enum(["suspend", "activate", "renew", "change_package", "clear_cancel"]),
      package_id: z.string().uuid().optional().nullable(),
      extend_days: z.number().int().min(1).max(3650).optional(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertManageRole(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: brand } = await supabaseAdmin
      .from("brands")
      .select("id, status, expires_at, current_package_id, packages:current_package_id(duration_days)")
      .eq("id", data.brand_id)
      .maybeSingle();
    if (!brand) throw new Error("Brand not found");

    const patch: Record<string, any> = {};

    if (data.action === "suspend") {
      patch.status = "suspended";
    } else if (data.action === "activate") {
      patch.status = "active";
      patch.cancel_requested_at = null;
    } else if (data.action === "clear_cancel") {
      patch.cancel_requested_at = null;
    } else if (data.action === "renew") {
      const days =
        data.extend_days ??
        (brand as any)?.packages?.duration_days ??
        30;
      const base = brand.expires_at && new Date(brand.expires_at) > new Date()
        ? new Date(brand.expires_at)
        : new Date();
      base.setDate(base.getDate() + days);
      patch.expires_at = base.toISOString();
      patch.status = "active";
      patch.cancel_requested_at = null;
    } else if (data.action === "change_package") {
      if (!data.package_id) throw new Error("package_id required");
      const { data: pkg } = await supabaseAdmin
        .from("packages")
        .select("id, duration_days, device_limit, message_limit, license_count")
        .eq("id", data.package_id)
        .maybeSingle();
      if (!pkg) throw new Error("Package not found");
      patch.current_package_id = pkg.id;
      patch.device_limit = pkg.device_limit;
      patch.message_limit = pkg.message_limit;
      patch.license_limit = pkg.license_count;
      // reset cycle
      const exp = new Date();
      exp.setDate(exp.getDate() + (pkg.duration_days ?? 30));
      patch.expires_at = exp.toISOString();
      patch.status = "active";
      patch.cancel_requested_at = null;
    }

    const { error } = await supabaseAdmin.from("brands").update(patch).eq("id", data.brand_id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("activity_log").insert({
      action: `subscription_${data.action}`,
      brand_id: data.brand_id,
      user_id: context.userId,
      details: { patch, package_id: data.package_id ?? null, extend_days: data.extend_days ?? null },
    });

    return { ok: true };
  });

/** Brand owner — request cancellation of their subscription. */
export const requestCancelSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ brand_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: brand } = await context.supabase
      .from("brands").select("id, created_by, name").eq("id", data.brand_id).maybeSingle();
    if (!brand || brand.created_by !== context.userId) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("brands")
      .update({ cancel_requested_at: new Date().toISOString() })
      .eq("id", data.brand_id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("activity_log").insert({
      action: "subscription_cancel_requested",
      brand_id: data.brand_id,
      user_id: context.userId,
      details: { brand_name: brand.name },
    });

    // notify admins
    try {
      const { notifyAdmins } = await import("@/lib/notify.server");
      const { data: profile } = await supabaseAdmin
        .from("profiles").select("email, full_name").eq("id", context.userId).maybeSingle();
      await notifyAdmins(
        `⚠️ *Cancellation Request*\n\n` +
          `Brand: ${brand.name}\n` +
          `From: ${profile?.full_name || profile?.email || context.userId}`,
      );
    } catch { /* ignore */ }

    return { ok: true };
  });
