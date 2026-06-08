import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function hasAnyRole(supabase: any, userId: string, roles: string[]) {
  const { data } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).in("role", roles);
  return (data ?? []).length > 0;
}

export const listDeviceRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("device_requests")
      .select("id, brand_id, requested_by, device_name, notes, status, admin_reply, created_at, updated_at, brands(name), profiles:requested_by(email, full_name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      ...r,
      brand_name: r.brands?.name,
      requester_email: r.profiles?.email,
      requester_name: r.profiles?.full_name,
    }));
  });

export const createDeviceRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      brand_id: z.string().uuid(),
      device_name: z.string().trim().min(1).max(200),
      notes: z.string().trim().max(2000).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("device_requests")
      .insert({
        brand_id: data.brand_id,
        requested_by: context.userId,
        device_name: data.device_name,
        notes: data.notes ?? null,
      })
      .select("id, brand_id, device_name, notes, brands(name)")
      .single();
    if (error) throw new Error(error.message);

    // best-effort WhatsApp notification to admin
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: settings } = await supabaseAdmin
        .from("system_settings")
        .select("notify_phone, notify_device_id")
        .eq("id", true)
        .maybeSingle();
      if (settings?.notify_phone && settings?.notify_device_id) {
        const { data: device } = await supabaseAdmin
          .from("devices")
          .select("api_secret, device_unique_id, status")
          .eq("id", settings.notify_device_id)
          .maybeSingle();
        if (device && device.status !== "disconnected" && device.status !== "inactive") {
          const { data: profile } = await supabaseAdmin
            .from("profiles").select("email, full_name").eq("id", context.userId).maybeSingle();
          const who = profile?.full_name || profile?.email || context.userId;
          const brandName = (row as any)?.brands?.name ?? "—";
          const msg =
            `🆕 New device config request\n\n` +
            `Brand: ${brandName}\n` +
            `From: ${who}\n` +
            `Device: ${data.device_name}\n` +
            (data.notes ? `Notes: ${data.notes}\n` : "");
          const { bdwebs } = await import("@/lib/bdwebs.server");
          await bdwebs.sendWhatsApp({
            secret: device.api_secret,
            account: device.device_unique_id,
            recipient: settings.notify_phone,
            message: msg,
          });
        }
      }
    } catch {
      // never fail the request because of notification problems
    }

    return { ok: true, id: (row as any)?.id };
  });

export const updateDeviceRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["pending", "in_progress", "done", "cancelled"]).optional(),
      admin_reply: z.string().trim().max(2000).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Only owner/sales_agent or the brand owner can update.
    const isStaff = await hasAnyRole(context.supabase, context.userId, ["owner", "sales_agent"]);
    if (!isStaff) {
      // brand owners may only cancel their own request
      const { data: req } = await context.supabase
        .from("device_requests").select("brand_id").eq("id", data.id).maybeSingle();
      if (!req) throw new Error("Request not found");
      const { data: brand } = await context.supabase
        .from("brands").select("created_by").eq("id", req.brand_id).maybeSingle();
      if (brand?.created_by !== context.userId) throw new Error("Forbidden");
      if (data.status && data.status !== "cancelled") throw new Error("Only staff can change status");
    }
    const patch: Record<string, any> = {};
    if (data.status) patch.status = data.status;
    if (data.admin_reply !== undefined) patch.admin_reply = data.admin_reply;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("device_requests").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDeviceRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("device_requests").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Notification settings (owner only) ----

export const getNotifySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isOwner = await hasAnyRole(context.supabase, context.userId, ["owner"]);
    if (!isOwner) throw new Error("Owner only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("system_settings")
      .select("notify_phone, notify_device_id")
      .eq("id", true)
      .maybeSingle();
    return data ?? { notify_phone: null, notify_device_id: null };
  });

export const setNotifySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      notify_phone: z.string().trim().max(20).nullable(),
      notify_device_id: z.string().uuid().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const isOwner = await hasAnyRole(context.supabase, context.userId, ["owner"]);
    if (!isOwner) throw new Error("Owner only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("system_settings")
      .upsert({ id: true, ...data }, { onConflict: "id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
