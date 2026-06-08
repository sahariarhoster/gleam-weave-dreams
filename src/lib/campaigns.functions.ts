import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============ CRUD ============

export const SEND_MODE_PRESETS = {
  direct:       { min_delay_seconds: 0,  max_delay_seconds: 2 },
  safety_basic: { min_delay_seconds: 5,  max_delay_seconds: 15 },
  safety_max:   { min_delay_seconds: 20, max_delay_seconds: 60 },
} as const;

const timeStr = z.string().regex(/^\d{2}:\d{2}$/);

const campaignInput = z.object({
  brand_id: z.string().uuid(),
  device_id: z.string().uuid(),
  name: z.string().min(1).max(150),
  message: z.string().min(1).max(4000),
  media_url: z.string().url().nullable().optional().or(z.literal("")),
  scheduled_at: z.string().nullable().optional(),
  send_mode: z.enum(["direct", "safety_basic", "safety_max"]).default("safety_basic"),
  min_delay_seconds: z.number().int().min(0).max(600).optional(),
  max_delay_seconds: z.number().int().min(0).max(600).optional(),
  send_window_start: timeStr.default("00:00"),
  send_window_end: timeStr.default("23:59"),
  group_ids: z.array(z.string().uuid()).min(1),
});

function windowSeconds(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 3600 + sm * 60;
  const e = eh * 3600 + em * 60;
  const diff = e >= s ? e - s : 24 * 3600 - s + e;
  return Math.max(diff, 60);
}

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("campaigns")
      .select("id, name, status, total_recipients, sent_count, failed_count, scheduled_at, created_at, brands(name), devices(name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getCampaign = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("campaigns")
      .select("*, brands(name), devices(name, device_unique_id)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => campaignInput.parse(d))
  .handler(async ({ data, context }) => {
    const { group_ids, media_url, send_mode, min_delay_seconds, max_delay_seconds, send_window_start, send_window_end, ...rest } = data;
    const preset = SEND_MODE_PRESETS[send_mode];
    const minD = min_delay_seconds ?? preset.min_delay_seconds;
    const maxD = Math.max(max_delay_seconds ?? preset.max_delay_seconds, minD);
    const avg = Math.max((minD + maxD) / 2, 0.5);
    const daily_limit = Math.max(1, Math.floor(windowSeconds(send_window_start, send_window_end) / avg));



    // pull contacts from groups, de-dupe phone numbers
    const { data: members, error: memErr } = await context.supabase
      .from("contact_group_members")
      .select("contacts(id, phone, name)")
      .in("group_id", group_ids);
    if (memErr) throw new Error(memErr.message);
    const seen = new Set<string>();
    const recipients: { contact_id: string; phone: string; name: string | null }[] = [];
    (members ?? []).forEach((m: any) => {
      const c = m.contacts;
      if (!c) return;
      if (seen.has(c.phone)) return;
      seen.add(c.phone);
      recipients.push({ contact_id: c.id, phone: c.phone, name: c.name });
    });

    // remove blocked numbers
    const { data: blocked } = await context.supabase
      .from("blocked_numbers")
      .select("phone")
      .eq("brand_id", data.brand_id);
    const blockedSet = new Set((blocked ?? []).map((b: any) => b.phone));
    const filtered = recipients.filter((r) => !blockedSet.has(r.phone));

    const status = data.scheduled_at ? "scheduled" : "draft";
    const { data: camp, error } = await context.supabase
      .from("campaigns")
      .insert({
        ...rest,
        send_mode,
        min_delay_seconds: minD,
        max_delay_seconds: maxD,
        send_window_start,
        send_window_end,
        daily_limit,
        media_url: media_url || null,
        status,
        total_recipients: filtered.length,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (filtered.length > 0) {
      const rows = filtered.map((r) => ({
        campaign_id: camp.id,
        contact_id: r.contact_id,
        phone: r.phone,
        rendered_message: data.message.replace(/\{name\}/g, r.name || ""),
        status: "queued",
      }));
      // chunked insert
      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500);
        const { error: insErr } = await context.supabase.from("campaign_messages").insert(chunk);
        if (insErr) throw new Error(insErr.message);
      }
    }

    return { ...camp, total_recipients: filtered.length };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setCampaignStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["draft", "scheduled", "running", "paused", "completed", "failed"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, any> = { status: data.status };
    if (data.status === "running") patch.started_at = new Date().toISOString();
    if (data.status === "completed") patch.completed_at = new Date().toISOString();
    const { error } = await context.supabase.from("campaigns").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ SEND ENGINE ============
// Runs synchronously; sends a chunk of queued messages respecting delays/window/daily limit.

function inSendWindow(start: string, end: string, now = new Date()): boolean {
  // BD time approx: server in UTC, BD = UTC+6
  const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes();
  const bdMin = (utcMin + 6 * 60) % (24 * 60);
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (startMin <= endMin) return bdMin >= startMin && bdMin < endMin;
  return bdMin >= startMin || bdMin < endMin;
}

export const runCampaignChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      max_messages: z.number().int().min(1).max(50).default(20),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: camp, error: cErr } = await context.supabase
      .from("campaigns")
      .select("id, status, device_id, min_delay_seconds, max_delay_seconds, daily_limit, send_window_start, send_window_end, sent_count, failed_count")
      .eq("id", data.id)
      .single();
    if (cErr || !camp) throw new Error("Campaign not found");
    if (camp.status === "paused") return { ran: 0, reason: "paused" };
    if (camp.status === "completed" || camp.status === "failed") return { ran: 0, reason: camp.status };

    if (!inSendWindow(camp.send_window_start ?? "09:00", camp.send_window_end ?? "21:00")) {
      return { ran: 0, reason: "outside_window" };
    }

    // daily limit (sent today)
    const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
    const { count: sentToday } = await context.supabase
      .from("campaign_messages")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", camp.id)
      .eq("status", "sent")
      .gte("sent_at", startOfDay.toISOString());
    const remainingToday = (camp.daily_limit ?? 500) - (sentToday ?? 0);
    if (remainingToday <= 0) return { ran: 0, reason: "daily_limit_reached" };

    const { data: ownDevice, error: ownDevErr } = await context.supabase
      .from("devices").select("id").eq("id", camp.device_id).maybeSingle();
    if (ownDevErr || !ownDevice) throw new Error("Device not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: device, error: dErr } = await supabaseAdmin
      .from("devices")
      .select("api_secret, device_unique_id")
      .eq("id", camp.device_id)
      .single();
    if (dErr || !device) throw new Error("Device not found");

    const take = Math.min(data.max_messages, remainingToday);
    const { data: queued, error: qErr } = await context.supabase
      .from("campaign_messages")
      .select("id, phone, rendered_message")
      .eq("campaign_id", camp.id)
      .eq("status", "queued")
      .order("created_at", { ascending: true })
      .limit(take);
    if (qErr) throw new Error(qErr.message);
    const batch = queued ?? [];

    if (batch.length === 0) {
      await context.supabase
        .from("campaigns")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", camp.id);
      return { ran: 0, reason: "no_more_queued", completed: true };
    }

    if (camp.status !== "running") {
      await context.supabase.from("campaigns")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("id", camp.id);
    }

    const { bdwebs } = await import("@/lib/bdwebs.server");

    let sent = 0;
    let failed = 0;
    for (let i = 0; i < batch.length; i++) {
      const msg = batch[i];
      let recipient = msg.phone.trim();
      if (!recipient.startsWith("+")) recipient = "+880" + recipient.replace(/^0+/, "");
      try {
        const res = await bdwebs.sendWhatsApp({
          secret: device.api_secret,
          account: device.device_unique_id,
          recipient,
          message: msg.rendered_message,
        });
        if (res.status === 200) {
          sent++;
          await context.supabase.from("campaign_messages").update({
            status: "sent", sent_at: new Date().toISOString(), gateway_response: res as any,
          }).eq("id", msg.id);
        } else {
          failed++;
          await context.supabase.from("campaign_messages").update({
            status: "failed", error_message: res.message, gateway_response: res as any,
          }).eq("id", msg.id);
        }
      } catch (e) {
        failed++;
        await context.supabase.from("campaign_messages").update({
          status: "failed", error_message: (e as Error).message,
        }).eq("id", msg.id);
      }

      // delay between sends (skip after last)
      if (i < batch.length - 1) {
        const min = camp.min_delay_seconds ?? 5;
        const max = camp.max_delay_seconds ?? 15;
        const delayMs = (min + Math.random() * Math.max(0, max - min)) * 1000;
        await new Promise((r) => setTimeout(r, Math.min(delayMs, 30000)));
      }
    }

    // counters + auto-pause on high failure
    const newSent = (camp.sent_count ?? 0) + sent;
    const newFailed = (camp.failed_count ?? 0) + failed;
    const total = newSent + newFailed;
    const failRate = total > 0 ? newFailed / total : 0;
    const patch: Record<string, any> = { sent_count: newSent, failed_count: newFailed };
    if (total >= 20 && failRate > 0.2) patch.status = "paused";
    await context.supabase.from("campaigns").update(patch as never).eq("id", camp.id);

    return { ran: batch.length, sent, failed, paused: patch.status === "paused" };
  });
