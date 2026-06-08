import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Stats = {
  devices: number;
  brands: number;
  brandUsers: number;
  campaigns: number;
  activeCampaigns: number;
  blockedNumbers: number;
  totalMessages: number;
  delivered: number;
  failed: number;
  pending: number;
};

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Stats> => {
    const sb = context.supabase;
    const counts = await Promise.all([
      sb.from("devices").select("*", { count: "exact", head: true }),
      sb.from("brands").select("*", { count: "exact", head: true }),
      sb.from("brand_members").select("*", { count: "exact", head: true }),
    ]);
    return {
      devices: counts[0].count ?? 0,
      brands: counts[1].count ?? 0,
      brandUsers: counts[2].count ?? 0,
      campaigns: 0,
      activeCampaigns: 0,
      blockedNumbers: 0,
      totalMessages: 0,
      delivered: 0,
      failed: 0,
      pending: 0,
    };
  });

// ============ Devices ============

const deviceInput = z.object({
  name: z.string().min(1).max(100),
  device_unique_id: z.string().min(1).max(200),
  sim_info: z.string().max(50).optional().nullable(),
  api_secret: z.string().min(1).max(500),
  brand_id: z.string().uuid().optional().nullable(),
});

export const listDevices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("devices")
      .select("id, name, device_unique_id, sim_info, brand_id, status, last_checked_at, created_at, brands(name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deviceInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("devices")
      .insert({ ...data, created_by: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deviceInput.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("devices").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("devices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testDeviceConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: device, error } = await context.supabase
      .from("devices")
      .select("api_secret")
      .eq("id", data.id)
      .single();
    if (error || !device) throw new Error("Device not found");
    const { bdwebs } = await import("@/lib/bdwebs.server");
    const res = await bdwebs.getCredits(device.api_secret);
    await context.supabase
      .from("devices")
      .update({
        last_checked_at: new Date().toISOString(),
        status: res.status === 200 ? "active" : "disconnected",
      })
      .eq("id", data.id);
    return { status: res.status, message: res.message, data: res.data };
  });

// ============ Send single SMS ============

export const sendSingleMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        device_id: z.string().uuid(),
        recipient: z.string().min(5).max(20),
        message: z.string().min(1).max(4000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: device, error } = await context.supabase
      .from("devices")
      .select("api_secret, device_unique_id, brand_id")
      .eq("id", data.device_id)
      .single();
    if (error || !device) throw new Error("Device not found");
    let recipient = data.recipient.trim();
    if (!recipient.startsWith("+")) recipient = "+880" + recipient.replace(/^0+/, "");
    const { bdwebs } = await import("@/lib/bdwebs.server");
    const res = await bdwebs.sendWhatsApp({
      secret: device.api_secret,
      account: device.device_unique_id,
      recipient,
      message: data.message,
    });
    await context.supabase.from("activity_log").insert({
      user_id: context.userId,
      brand_id: device.brand_id ?? null,
      action: "send_single",
      details: { recipient, status: res.status, message: res.message },
    });
    if (res.status !== 200) {
      throw new Error(res.message || "Failed to send");
    }
    return { ok: true, message: res.message };
  });
