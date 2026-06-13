import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertOwner(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "owner").maybeSingle();
  if (!data) throw new Error("Forbidden: owner only");
}

function normalizePhone(num: string | null | undefined): string {
  if (!num) return "";
  let d = num.replace(/\D+/g, "");
  if (!d) return "";
  if (d.length === 11 && d.startsWith("01")) d = "880" + d.slice(1);
  else if (d.length === 10 && d.startsWith("1")) d = "880" + d;
  return d;
}

async function gatherRecipients(supabaseAdmin: any) {
  const { data: bm } = await supabaseAdmin
    .from("brand_members").select("user_id").eq("role", "brand_admin");
  const { data: br } = await supabaseAdmin
    .from("user_roles").select("user_id").eq("role", "brand_owner");
  const { data: bo } = await supabaseAdmin
    .from("brands").select("created_by");
  const ids = new Set<string>();
  (bm ?? []).forEach((r: any) => r.user_id && ids.add(r.user_id));
  (br ?? []).forEach((r: any) => r.user_id && ids.add(r.user_id));
  (bo ?? []).forEach((r: any) => r.created_by && ids.add(r.created_by));
  if (ids.size === 0) return [];
  const { data: profiles } = await supabaseAdmin
    .from("profiles").select("id, full_name, phone, email").in("id", Array.from(ids));
  return (profiles ?? []) as { id: string; full_name: string | null; phone: string | null; email: string | null }[];
}

export const previewBrandAdminRecipients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const recipients = await gatherRecipients(supabaseAdmin);

    // Detect phones already notified in the last 24h (via direct sender or prior campaign messages with notice tag)
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: logs } = await supabaseAdmin
      .from("activity_log")
      .select("details")
      .eq("action", "admin_notify")
      .gte("created_at", since);
    const notifiedDirect = new Set<string>();
    (logs ?? []).forEach((l: any) => {
      const r = l?.details?.recipient;
      const status = l?.details?.status;
      if (r && status === 200) notifiedDirect.add(normalizePhone(r));
    });

    // Also detect any previous notice campaigns (name prefix "Notice:") with sent messages
    const { data: noticeCamps } = await supabaseAdmin
      .from("campaigns").select("id").ilike("name", "Notice:%").gte("created_at", since);
    let notifiedCampaign = new Set<string>();
    if ((noticeCamps ?? []).length > 0) {
      const ids = (noticeCamps ?? []).map((c: any) => c.id);
      const { data: msgs } = await supabaseAdmin
        .from("campaign_messages")
        .select("phone, status")
        .in("campaign_id", ids)
        .eq("status", "sent");
      (msgs ?? []).forEach((m: any) => notifiedCampaign.add(normalizePhone(m.phone)));
    }

    const enriched = recipients.map((r) => {
      const norm = normalizePhone(r.phone);
      const alreadySent = !!norm && (notifiedDirect.has(norm) || notifiedCampaign.has(norm));
      return { ...r, normalized_phone: norm, already_sent: alreadySent };
    });
    return { recipients: enriched };
  });

export const sendBrandAdminNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      message: z.string().min(1).max(4000),
      include_already_sent: z.boolean().optional().default(false),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Determine notify device + brand
    const { data: settings } = await supabaseAdmin
      .from("system_settings").select("notify_device_id").limit(1).maybeSingle();
    if (!settings?.notify_device_id) throw new Error("Notify device is not configured in system settings.");
    const { data: device } = await supabaseAdmin
      .from("devices").select("id, brand_id").eq("id", settings.notify_device_id).maybeSingle();
    if (!device?.brand_id) throw new Error("Notify device has no brand assigned.");

    // Compute recipients with the same dedupe logic as preview
    const recipients = await gatherRecipients(supabaseAdmin);
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { data: logs } = await supabaseAdmin
      .from("activity_log").select("details").eq("action", "admin_notify").gte("created_at", since);
    const notified = new Set<string>();
    (logs ?? []).forEach((l: any) => {
      const r = l?.details?.recipient;
      const status = l?.details?.status;
      if (r && status === 200) notified.add(normalizePhone(r));
    });
    const { data: noticeCamps } = await supabaseAdmin
      .from("campaigns").select("id").ilike("name", "Notice:%").gte("created_at", since);
    if ((noticeCamps ?? []).length > 0) {
      const ids = (noticeCamps ?? []).map((c: any) => c.id);
      const { data: msgs } = await supabaseAdmin
        .from("campaign_messages").select("phone, status").in("campaign_id", ids).eq("status", "sent");
      (msgs ?? []).forEach((m: any) => notified.add(normalizePhone(m.phone)));
    }

    const seen = new Set<string>();
    const queue: { phone: string; name: string | null }[] = [];
    let skippedNoPhone = 0;
    let skippedAlready = 0;
    for (const r of recipients) {
      const norm = normalizePhone(r.phone);
      if (!norm || norm.length < 8) { skippedNoPhone++; continue; }
      if (seen.has(norm)) continue;
      seen.add(norm);
      if (!data.include_already_sent && notified.has(norm)) { skippedAlready++; continue; }
      queue.push({ phone: norm, name: r.full_name });
    }

    if (queue.length === 0) {
      return { ok: false, campaign_id: null, queued: 0, skipped_no_phone: skippedNoPhone, skipped_already_sent: skippedAlready };
    }

    const name = `Notice: ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
    const { data: camp, error: cErr } = await supabaseAdmin
      .from("campaigns")
      .insert({
        brand_id: device.brand_id,
        device_id: device.id,
        name,
        message: data.message,
        status: "running",
        send_mode: "safety_basic",
        min_delay_seconds: 10,
        max_delay_seconds: 23,
        send_window_start: "00:00",
        send_window_end: "23:59",
        daily_limit: 5000,
        total_recipients: queue.length,
        ignore_failure_pause: true,
        started_at: new Date().toISOString(),
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (cErr || !camp) throw new Error(cErr?.message ?? "Failed to create notice campaign");

    const rows = queue.map((q) => ({
      campaign_id: camp.id,
      phone: q.phone,
      rendered_message: data.message.replace(/\{name\}/g, q.name || ""),
      status: "queued",
    }));
    for (let i = 0; i < rows.length; i += 500) {
      const chunk = rows.slice(i, i + 500);
      const { error: insErr } = await supabaseAdmin.from("campaign_messages").insert(chunk);
      if (insErr) throw new Error(insErr.message);
    }

    return {
      ok: true,
      campaign_id: camp.id,
      queued: queue.length,
      skipped_no_phone: skippedNoPhone,
      skipped_already_sent: skippedAlready,
    };
  });
