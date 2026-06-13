import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertOwner(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["owner", "brand_owner", "support_agent"]);
  if (!data || data.length === 0) throw new Error("You don't have permission to manage devices");
}

async function assertStrictOwner(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();
  if (!data) throw new Error("Owner only");
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
    const { data, error } = await (context.supabase as any).rpc("get_dashboard_stats_for_user", {
      _user_id: context.userId,
    });
    if (error) throw new Error(error.message);
    const stats = data as Partial<Stats> | null;

    return {
      devices: Number(stats?.devices ?? 0),
      devicesOnline: Number(stats?.devicesOnline ?? 0),
      brands: Number(stats?.brands ?? 0),
      brandUsers: Number(stats?.brandUsers ?? 0),
      campaigns: Number(stats?.campaigns ?? 0),
      activeCampaigns: Number(stats?.activeCampaigns ?? 0),
      blockedNumbers: Number(stats?.blockedNumbers ?? 0),
      totalMessages: Number(stats?.totalMessages ?? 0),
      delivered: Number(stats?.delivered ?? 0),
      failed: Number(stats?.failed ?? 0),
      pending: Number(stats?.pending ?? 0),
      todayMessages: Number(stats?.todayMessages ?? 0),
      series: stats?.series ?? [],
      topDevices: stats?.topDevices ?? [],
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
    await assertStrictOwner(context.supabase, context.userId);
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

// ============ WhatsApp QR Linking ============

export const listWaServers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ device_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: own } = await context.supabase
      .from("devices").select("id").eq("id", data.device_id).maybeSingle();
    if (!own) throw new Error("Device not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: device } = await supabaseAdmin
      .from("devices").select("api_secret").eq("id", data.device_id).single();
    if (!device?.api_secret) throw new Error("Device API secret missing");
    const { bdwebs } = await import("@/lib/bdwebs.server");
    const res = await bdwebs.getWaServers(device.api_secret);
    if (res.status !== 200) throw new Error(res.message || "Failed to list servers");
    return Array.isArray(res.data) ? res.data : [];
  });

export const linkDeviceQR = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      device_id: z.string().uuid(),
      sid: z.number().int().positive(),
      relink: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: own } = await context.supabase
      .from("devices").select("id").eq("id", data.device_id).maybeSingle();
    if (!own) throw new Error("Device not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: device } = await supabaseAdmin
      .from("devices").select("api_secret, device_unique_id").eq("id", data.device_id).single();
    if (!device?.api_secret) throw new Error("Device API secret missing");
    const { bdwebs } = await import("@/lib/bdwebs.server");
    const res = data.relink && device.device_unique_id
      ? await bdwebs.relinkWhatsApp({
          secret: device.api_secret, sid: data.sid, unique: device.device_unique_id,
        })
      : await bdwebs.linkWhatsApp({ secret: device.api_secret, sid: data.sid });
    if (res.status !== 200) throw new Error(res.message || "Failed to generate QR");
    return res.data as { qrstring: string; qrimagelink: string; infolink?: string };
  });

// ============ API Key Pool ============

export const listApiKeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStrictOwner(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("wa_api_keys")
      .select("id, label, secret, sid, active, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      label: z.string().min(1).max(120),
      secret: z.string().min(4).max(500),
      sid: z.number().int().positive().default(1),
      active: z.boolean().default(true),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStrictOwner(context.supabase, context.userId);
    const { error } = await context.supabase.from("wa_api_keys").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      label: z.string().min(1).max(120).optional(),
      secret: z.string().min(4).max(500).optional(),
      sid: z.number().int().positive().optional(),
      active: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertStrictOwner(context.supabase, context.userId);
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("wa_api_keys").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertStrictOwner(context.supabase, context.userId);
    const { error } = await context.supabase.from("wa_api_keys").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Add-Device QR flow (uses random pool key) ============

export const startDeviceLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ brand_id: z.string().uuid().nullable().optional() }).parse(d),
  )
  .handler(async ({ context }) => {
    await assertOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: keys, error: keysErr } = await supabaseAdmin
      .from("wa_api_keys")
      .select("id, secret, sid")
      .eq("active", true);
    if (keysErr) throw new Error(keysErr.message);
    if (!keys || keys.length === 0) {
      throw new Error("No active API keys configured. Add one in Settings → API Keys.");
    }
    const pick = keys[Math.floor(Math.random() * keys.length)];
    const { bdwebs } = await import("@/lib/bdwebs.server");
    const res = await bdwebs.linkWhatsApp({ secret: pick.secret, sid: pick.sid });
    if (res.status !== 200) throw new Error(res.message || "Failed to generate QR");
    const d = res.data as { qrstring?: string; qrimagelink?: string; infolink?: string };
    return {
      api_key_id: pick.id,
      qrimagelink: d.qrimagelink ?? "",
      infolink: d.infolink ?? "",
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    };
  });

export const pollDeviceLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      api_key_id: z.string().uuid(),
      infolink: z.string().url(),
      name: z.string().min(1).max(100),
      sim_info: z.string().max(50).nullable().optional(),
      brand_id: z.string().uuid().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: key } = await supabaseAdmin
      .from("wa_api_keys")
      .select("secret")
      .eq("id", data.api_key_id)
      .maybeSingle();
    if (!key?.secret) throw new Error("API key no longer exists");

    let info: any = null;
    try {
      const res = await fetch(data.infolink, { method: "GET" });
      const text = await res.text();
      try { info = JSON.parse(text); } catch { info = { raw: text }; }
    } catch (e: any) {
      return { status: "pending" as const, message: String(e?.message ?? e) };
    }

    const root = info?.data ?? info ?? {};
    const unique: string | undefined =
      root.unique ?? root.account ?? root.device_unique_id ?? info?.unique;
    const waId: string | undefined =
      root.whatsapp ?? root.whatsapp_id ?? root.wid ?? root.phone ??
      root.sim ?? root.number ?? root.msisdn ?? unique;

    if (!unique) {
      return { status: "pending" as const, message: info?.message ?? "Waiting for scan…" };
    }

    // Idempotent: if this device already exists, return it.
    const { data: existing } = await supabaseAdmin
      .from("devices")
      .select("id")
      .eq("device_unique_id", unique)
      .maybeSingle();
    if (existing) return { status: "linked" as const, device_id: existing.id };

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("devices")
      .insert({
        name: data.name,
        device_unique_id: unique,
        sim_info: data.sim_info ?? waId ?? null,
        api_secret: key.secret,
        brand_id: data.brand_id ?? null,
        status: "active",
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    return { status: "linked" as const, device_id: inserted.id };
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
