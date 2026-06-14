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

async function isPlatformOwner(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["owner", "support_agent"])
    .maybeSingle();
  return !!data;
}

/**
 * Enforce that the caller can attach a new device to `brand_id` and that the
 * brand still has room under its device_limit. Platform owners/support bypass
 * the brand-ownership check but still respect the device_limit when a
 * brand_id is provided.
 */
async function assertCanAddDeviceToBrand(
  userId: string,
  brand_id: string | null | undefined,
  opts: { skipLimitCheck?: boolean; existingDeviceUnique?: string | null } = {},
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const platformOwner = await isPlatformOwner(supabaseAdmin, userId);

  if (!brand_id) {
    if (!platformOwner) throw new Error("Select a brand to add this device to.");
    return; // platform owner can create unassigned devices
  }

  const { data: brand, error: bErr } = await supabaseAdmin
    .from("brands")
    .select("id, created_by, device_limit, status")
    .eq("id", brand_id)
    .maybeSingle();
  if (bErr || !brand) throw new Error("Brand not found");

  if (!platformOwner) {
    const isOwner = brand.created_by === userId;
    let isAdmin = false;
    if (!isOwner) {
      const { data: mem } = await supabaseAdmin
        .from("brand_members")
        .select("role")
        .eq("brand_id", brand_id)
        .eq("user_id", userId)
        .maybeSingle();
      isAdmin = mem?.role === "brand_admin";
    }
    if (!isOwner && !isAdmin) {
      throw new Error("You don't have permission to add devices to this brand.");
    }
  }

  if (brand.status && brand.status !== "active") {
    throw new Error("This brand is not active.");
  }

  if (opts.skipLimitCheck) return;

  const limit = Number(brand.device_limit ?? 0);
  if (limit > 0) {
    let q = supabaseAdmin
      .from("devices")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", brand_id);
    // When re-linking an existing device, exclude it from the count.
    if (opts.existingDeviceUnique) {
      q = q.neq("device_unique_id", opts.existingDeviceUnique);
    }
    const { count } = await q;
    if ((count ?? 0) >= limit) {
      throw new Error(
        `Device limit reached for this brand (${count}/${limit}). Upgrade your plan to add more devices.`,
      );
    }
  }
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

export const getDashboardStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }): Promise<Stats> => {
    const { data: res, error } = await (context.supabase as any).rpc("get_dashboard_stats_for_current_user", {
      _start: data?.start ?? null,
      _end: data?.end ?? null,
    });
    if (error) {
      console.error("[dashboard.stats]", error.message);
      throw new Error("Failed to load dashboard");
    }
    const stats = res as Partial<Stats> | null;

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
    await assertCanAddDeviceToBrand(context.userId, data.brand_id ?? null);
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: device } = await supabaseAdmin
      .from("devices")
      .select("api_secret, device_unique_id")
      .eq("id", data.id)
      .maybeSingle();
    if (device?.api_secret && device?.device_unique_id) {
      try {
        const { bdwebs } = await import("@/lib/bdwebs.server");
        // Resolve numeric WA account id by looking it up on the panel.
        let waId: number | string | undefined;
        try {
          const list = await bdwebs.getWhatsAppAccounts(device.api_secret);
          const accounts = Array.isArray(list.data) ? list.data : [];
          const match = accounts.find((a: any) =>
            a.unique === device.device_unique_id ||
            a.account === device.device_unique_id ||
            a.device_unique_id === device.device_unique_id,
          );
          waId = match?.id ?? match?.account_id;
        } catch (e) {
          console.warn("getWhatsAppAccounts (for delete) failed", e);
        }

        // Try several endpoint shapes; panels differ in path + param name.
        const attempts: Array<{ path: string; params: Record<string, any> }> = [];
        if (waId !== undefined && waId !== null) {
          attempts.push({ path: "/api/delete/whatsapp", params: { secret: device.api_secret, id: waId } });
          attempts.push({ path: "/api/delete/wa.account", params: { secret: device.api_secret, id: waId } });
        }
        attempts.push({ path: "/api/delete/whatsapp", params: { secret: device.api_secret, unique: device.device_unique_id } });
        attempts.push({ path: "/api/delete/wa.account", params: { secret: device.api_secret, unique: device.device_unique_id } });

        let ok = false;
        for (const a of attempts) {
          try {
            const r = await bdwebs.rawPost(a.path, a.params);
            console.log("deleteWhatsApp try", a.path, a.params, "→", r.status, r.message);
            if (r.status === 200) { ok = true; break; }
          } catch (e) {
            console.warn("deleteWhatsApp attempt error", a.path, e);
          }
        }
        if (!ok) console.warn("deleteWhatsApp: no endpoint accepted the request");
      } catch (e) {
        console.warn("deleteWhatsApp panel call failed", e);
      }
    }
    const { error } = await context.supabase.from("devices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const refreshDeviceStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: visible } = await context.supabase
      .from("devices")
      .select("id");
    const ids = (visible ?? []).map((r: any) => r.id);
    if (ids.length === 0) return { updated: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("devices")
      .select("id, api_secret, device_unique_id")
      .in("id", ids);

    const { bdwebs } = await import("@/lib/bdwebs.server");
    const bySecret = new Map<string, Array<{ id: string; device_unique_id: string }>>();
    for (const r of rows ?? []) {
      if (!r.api_secret || !r.device_unique_id) continue;
      const list = bySecret.get(r.api_secret) ?? [];
      list.push({ id: r.id, device_unique_id: r.device_unique_id });
      bySecret.set(r.api_secret, list);
    }

    let updated = 0;
    const nowIso = new Date().toISOString();
    for (const [secret, group] of bySecret) {
      let accounts: any[] = [];
      try {
        const res = await bdwebs.getWhatsAppAccounts(secret);
        accounts = Array.isArray(res.data) ? res.data : [];
      } catch (e) {
        console.warn("getWhatsAppAccounts failed", e);
        continue;
      }
      for (const dev of group) {
        let acc = accounts.find((a: any) =>
          a.unique === dev.device_unique_id ||
          a.account === dev.device_unique_id ||
          a.device_unique_id === dev.device_unique_id,
        );
        // Auto-heal: if this secret only has one account on the panel,
        // adopt it even when the stored device_unique_id is stale.
        if (!acc && accounts.length === 1) acc = accounts[0];
        const rawStatus = String(acc?.status ?? "").toLowerCase();
        const status = !acc
          ? "disconnected"
          : rawStatus === "1" || rawStatus === "active" || rawStatus === "connected"
            ? "active"
            : "disconnected";
        const patch: { status: "active" | "disconnected"; last_checked_at: string; device_unique_id?: string } = { status, last_checked_at: nowIso };
        const panelUnique = acc?.unique ?? acc?.account ?? acc?.device_unique_id;
        if (panelUnique && panelUnique !== dev.device_unique_id) {
          patch.device_unique_id = String(panelUnique);
        }
        await supabaseAdmin.from("devices").update(patch).eq("id", dev.id);
        updated++;
      }
    }
    return { updated };
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
    const { bdwebs } = await import("@/lib/bdwebs.server");
    // Try the device's own secret first, then fall back to active pool keys.
    const secrets: string[] = [];
    if (device?.api_secret) secrets.push(device.api_secret);
    const { data: pool } = await supabaseAdmin
      .from("wa_api_keys").select("secret").eq("active", true).order("created_at", { ascending: false });
    for (const k of pool ?? []) {
      if (k.secret && !secrets.includes(k.secret)) secrets.push(k.secret);
    }
    let lastMessage = "Failed to list servers";
    for (const secret of secrets) {
      try {
        const res = await bdwebs.getWaServers(secret);
        if (res.status === 200 && Array.isArray(res.data) && res.data.length > 0) {
          return res.data;
        }
        if (res.message) lastMessage = res.message;
      } catch (e) {
        lastMessage = (e as Error).message;
      }
    }
    if (secrets.length === 0) throw new Error("No WhatsApp API secret configured");
    return [];
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
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    // Permission + limit pre-check (skip limit here; we re-check at poll time
    // since a re-link of an existing device shouldn't be blocked by the cap).
    await assertCanAddDeviceToBrand(context.userId, data?.brand_id ?? null, {
      skipLimitCheck: true,
    });


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
      expires_at: new Date(Date.now() + 180_000).toISOString(),
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
    // Permission only — we recheck the device_limit once we know `unique`
    // so re-linking an existing device doesn't trip the cap.
    await assertCanAddDeviceToBrand(context.userId, data.brand_id ?? null, {
      skipLimitCheck: true,
    });


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

    const root: any = info?.data ?? info ?? {};
    let unique: string | undefined =
      root.unique ?? root.account ?? root.device_unique_id ?? root.uniqueId ??
      root.unique_id ?? root.uid ?? info?.unique;
    let waId: string | undefined =
      root.whatsapp ?? root.whatsapp_id ?? root.wid ?? root.phone ??
      root.sim ?? root.number ?? root.msisdn ?? unique;

    // Only treat as linked when the infolink itself reports the scanned
    // account. Do NOT fall back to wa.accounts here — it would pick up an
    // unrelated existing device on the same panel API key and falsely mark
    // the new QR as "linked" before the user has scanned anything (also
    // blocking second-device adds by re-linking the first device instead).
    if (!unique) {
      console.log("pollDeviceLink waiting — info payload:", JSON.stringify(info).slice(0, 600));
      return { status: "pending" as const, message: info?.message ?? "Waiting for scan…" };
    }



    // Upsert: if this device already exists, refresh its fields; else insert.
    const { data: existing } = await supabaseAdmin
      .from("devices")
      .select("id")
      .eq("device_unique_id", unique)
      .maybeSingle();

    let deviceId: string;
    if (existing) {
      // Re-link path — enforce limit but exclude this device from the count.
      await assertCanAddDeviceToBrand(context.userId, data.brand_id ?? null, {
        existingDeviceUnique: unique,
      });

      const { error: updErr } = await supabaseAdmin
        .from("devices")
        .update({
          name: data.name,
          sim_info: data.sim_info ?? waId ?? null,
          api_secret: key.secret,
          brand_id: data.brand_id ?? null,
          status: "active",
          last_checked_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (updErr) throw new Error(updErr.message);
      deviceId = existing.id;
    } else {
      // New device — full check including device_limit.
      await assertCanAddDeviceToBrand(context.userId, data.brand_id ?? null);
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
      deviceId = inserted.id;
    }


    // Disable "Receive Chats" and "Random Send Interval" by default on the WA panel.
    try {
      const { bdwebs } = await import("@/lib/bdwebs.server");
      let waAccountId: number | string | undefined =
        root.id ?? root.account_id ?? root.wa_id;
      if (waAccountId === undefined || waAccountId === null) {
        const accRes = await bdwebs.getWhatsAppAccounts(key.secret);
        const accounts = (accRes?.data ?? []) as Array<Record<string, any>>;
        const match = accounts.find(
          (a) =>
            a.unique === unique ||
            a.account === unique ||
            a.device_unique_id === unique,
        );
        waAccountId = match?.id;
      }

      if (waAccountId !== undefined && waAccountId !== null) {
        const { panelEditWhatsApp } = await import("@/lib/panel.server");
        const r = await panelEditWhatsApp({
          id: waAccountId,
          receive_chats: 2,
          random_send: 2,
          random_min: 1,
          random_max: 5,
        });
        console.log(
          `editWhatsApp panel → ok=${r.ok} status=${r.status} endpoint=${r.endpoint}`,
        );
      } else {
        console.warn("editWhatsApp defaults: no WA account id found for", unique);
      }

    } catch (e) {
      console.warn("editWhatsApp defaults failed", e);
    }

    // Notify support/admins about the successful link.
    try {
      const { notifyAdmins } = await import("@/lib/notify.server");
      let brandName = "—";
      if (data.brand_id) {
        const { data: b } = await supabaseAdmin
          .from("brands").select("name").eq("id", data.brand_id).maybeSingle();
        if (b?.name) brandName = b.name;
      }
      const { data: prof } = await supabaseAdmin
        .from("profiles").select("full_name, email").eq("id", context.userId).maybeSingle();
      const who = prof?.full_name || prof?.email || context.userId;
      await notifyAdmins(
        `✅ Device linked\nName: ${data.name}\nSIM: ${waId ?? "—"}\nBrand: ${brandName}\nBy: ${who}`,
      );
    } catch (e) {
      console.warn("notifyAdmins (device linked) failed", e);
    }

    return { status: "linked" as const, device_id: deviceId };
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

export const applyDeviceDefaults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: dev } = await supabaseAdmin
      .from("devices")
      .select("api_secret, device_unique_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!dev?.api_secret) throw new Error("Device not found");

    const { bdwebs } = await import("@/lib/bdwebs.server");
    const accRes = await bdwebs.getWhatsAppAccounts(dev.api_secret);
    const accounts = (accRes?.data ?? []) as Array<Record<string, any>>;
    const match = accounts.find(
      (a) =>
        a.unique === dev.device_unique_id ||
        a.account === dev.device_unique_id ||
        a.device_unique_id === dev.device_unique_id,
    );
    if (!match?.id) throw new Error("WhatsApp account not found on panel");

    // The bdwebs `/api/edit/whatsapp` endpoint isn't exposed as an API-key
    // permission on HosterCamp, so go straight to the panel AJAX route
    // (multipart, mirroring Zender's `[zender-form]` submit).
    const { panelEditWhatsApp } = await import("@/lib/panel.server");
    const r = await panelEditWhatsApp({
      id: match.id,
      receive_chats: 2,
      random_send: 2,
      random_min: 1,
      random_max: 5,
    });
    if (!r.ok) {
      const message = `Panel rejected edit (status ${r.status}): ${r.body.slice(0, 200) || "no body"}`;
      console.warn("applyDeviceDefaults failed", { message, attempts: r.attempts });
      return { ok: false, message };
    }
    return { ok: true, endpoint: r.endpoint, message: "Receive Chats & Random Send disabled" };
  });
