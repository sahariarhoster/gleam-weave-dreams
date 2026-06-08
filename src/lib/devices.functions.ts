import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertOwner(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["owner", "brand_owner"]);
  if (!data || data.length === 0) throw new Error("You don't have permission to manage devices");
}

type Stats = {
  devices: number;
  devicesOnline: number;
  brands: number;
  brandUsers: number;
  campaigns: number;
  activeCampaigns: number;
  blockedNumbers: number;
  totalMessages: number;
  delivered: number;
  failed: number;
  pending: number;
  todayMessages: number;
  series: { date: string; delivered: number; failed: number; pending: number }[];
  topDevices: { id: string; name: string; status: string }[];
};

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Stats> => {
    const sb = context.supabase;
    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    const [devicesQ, brandsQ, membersQ, campaignsQ, activeQ, blockedQ, msgsQ, recentMsgsQ, devicesListQ, pluginAllQ, pluginRecentQ] =
      await Promise.all([
        sb.from("devices").select("*", { count: "exact", head: true }),
        sb.from("brands").select("*", { count: "exact", head: true }),
        sb.from("brand_members").select("*", { count: "exact", head: true }),
        sb.from("campaigns").select("*", { count: "exact", head: true }),
        sb.from("campaigns").select("*", { count: "exact", head: true }).in("status", ["running", "scheduled"]),
        sb.from("blocked_numbers").select("*", { count: "exact", head: true }),
        sb.from("campaign_messages").select("status"),
        sb
          .from("campaign_messages")
          .select("status, created_at")
          .gte("created_at", since.toISOString()),
        sb.from("devices").select("id, name, status").order("created_at", { ascending: false }).limit(5),
        sb.from("activity_log").select("details").eq("action", "plugin_send"),
        sb.from("activity_log").select("details, created_at").eq("action", "plugin_send").gte("created_at", since.toISOString()),
      ]);

    const totals = { delivered: 0, failed: 0, pending: 0 };
    (msgsQ.data ?? []).forEach((m: any) => {
      if (m.status === "sent" || m.status === "delivered") totals.delivered++;
      else if (m.status === "failed") totals.failed++;
      else totals.pending++;
    });
    const pluginStatus = (d: any) => (d?.status === 200 ? "sent" : "failed");
    (pluginAllQ.data ?? []).forEach((r: any) => {
      const s = pluginStatus(r.details);
      if (s === "sent") totals.delivered++;
      else totals.failed++;
    });

    const series: Stats["series"] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      series.push({ date: d.toISOString().slice(0, 10), delivered: 0, failed: 0, pending: 0 });
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    let today = 0;
    (recentMsgsQ.data ?? []).forEach((m: any) => {
      const day = new Date(m.created_at).toISOString().slice(0, 10);
      const slot = series.find((x) => x.date === day);
      if (!slot) return;
      if (m.status === "sent" || m.status === "delivered") slot.delivered++;
      else if (m.status === "failed") slot.failed++;
      else slot.pending++;
      if (day === todayStr) today++;
    });
    (pluginRecentQ.data ?? []).forEach((r: any) => {
      const day = new Date(r.created_at).toISOString().slice(0, 10);
      const slot = series.find((x) => x.date === day);
      if (!slot) return;
      if (pluginStatus(r.details) === "sent") slot.delivered++;
      else slot.failed++;
      if (day === todayStr) today++;
    });


    const devicesList = (devicesListQ.data ?? []) as any[];
    const devicesOnline = devicesList.filter((d) => d.status === "active" || d.status === "online").length;

    return {
      devices: devicesQ.count ?? 0,
      devicesOnline,
      brands: brandsQ.count ?? 0,
      brandUsers: membersQ.count ?? 0,
      campaigns: campaignsQ.count ?? 0,
      activeCampaigns: activeQ.count ?? 0,
      blockedNumbers: blockedQ.count ?? 0,
      totalMessages: (msgsQ.data ?? []).length + (pluginAllQ.data ?? []).length,
      delivered: totals.delivered,
      failed: totals.failed,
      pending: totals.pending,
      todayMessages: today,
      series,
      topDevices: devicesList.map((d) => ({ id: d.id, name: d.name, status: d.status })),
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
    await assertOwner(context.supabase, context.userId);
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
  .inputValidator((d: unknown) =>
    deviceInput.partial({ api_secret: true }).extend({ id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { id, api_secret, ...rest } = data;
    const patch = { ...rest, ...(api_secret && api_secret.length > 0 ? { api_secret } : {}) };
    const { error } = await context.supabase.from("devices").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { error } = await context.supabase.from("devices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testDeviceConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      recipient: z.string().min(5).max(20),
      message: z.string().min(1).max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    // Verify caller has access to this device via RLS-scoped read (without sensitive columns)
    const { data: own, error: ownErr } = await context.supabase
      .from("devices")
      .select("id")
      .eq("id", data.id)
      .maybeSingle();
    if (ownErr || !own) throw new Error("Device not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: device, error } = await supabaseAdmin
      .from("devices")
      .select("api_secret, device_unique_id")
      .eq("id", data.id)
      .single();
    if (error || !device) throw new Error("Device not found");
    let recipient = data.recipient.trim();
    if (!recipient.startsWith("+")) recipient = "+880" + recipient.replace(/^0+/, "");
    const { bdwebs } = await import("@/lib/bdwebs.server");
    const res = await bdwebs.sendWhatsApp({
      secret: device.api_secret,
      account: device.device_unique_id,
      recipient,
      message: data.message ?? "✅ Test message from WA Suite",
    });
    await context.supabase
      .from("devices")
      .update({
        last_checked_at: new Date().toISOString(),
        status: res.status === 200 ? "active" : "disconnected",
      })
      .eq("id", data.id);
    return { status: res.status, message: res.message };
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
    const { data: own, error: ownErr } = await context.supabase
      .from("devices").select("id").eq("id", data.device_id).maybeSingle();
    if (ownErr || !own) throw new Error("Device not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: device, error } = await supabaseAdmin
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
