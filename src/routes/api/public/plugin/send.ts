import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { corsPreflight, jsonResponse, licenseKeySchema, loadLicense } from "@/lib/plugin-api.server";

const Body = z.object({
  license_key: licenseKeySchema,
  recipient: z.string().min(5).max(20),
  message: z.string().min(1).max(4000),
  customer_name: z.string().min(1).max(200).optional(),
});

const GROUP_NAME = "WordPress";
const GROUP_SUCCESS = "WordPress - Success";
const GROUP_FAILED = "WordPress - Failed";

async function getOrCreateGroup(supabaseAdmin: any, brand_id: string, name: string, description: string) {
  const { data: existing } = await supabaseAdmin
    .from("contact_groups")
    .select("id")
    .eq("brand_id", brand_id)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing;
  const ins = await supabaseAdmin
    .from("contact_groups")
    .insert({ brand_id, name, description })
    .select("id")
    .single();
  return ins.data;
}

async function ensureContactInWordpressGroup(
  supabaseAdmin: any,
  brand_id: string,
  phone: string,
  name: string | undefined,
  outcome: "success" | "failed",
) {
  // Base "WordPress" group (kept for backward compatibility with stats endpoint)
  const baseGroup = await getOrCreateGroup(supabaseAdmin, brand_id, GROUP_NAME, "Auto-created from WordPress plugin");
  const outcomeGroup = await getOrCreateGroup(
    supabaseAdmin,
    brand_id,
    outcome === "success" ? GROUP_SUCCESS : GROUP_FAILED,
    outcome === "success"
      ? "Recipients of successful WordPress plugin sends"
      : "Recipients of failed WordPress plugin sends",
  );

  // Find/create contact by phone
  let { data: contact } = await supabaseAdmin
    .from("contacts")
    .select("id, name")
    .eq("brand_id", brand_id)
    .eq("phone", phone)
    .maybeSingle();
  if (!contact) {
    const ins = await supabaseAdmin
      .from("contacts")
      .insert({ brand_id, phone, name: name ?? null })
      .select("id")
      .single();
    contact = ins.data;
  } else if (name && !contact.name) {
    await supabaseAdmin.from("contacts").update({ name }).eq("id", contact.id);
  }
  if (!contact) return;

  // Link in both base group and outcome-specific group (idempotent)
  const rows: any[] = [];
  if (baseGroup?.id) rows.push({ group_id: baseGroup.id, contact_id: contact.id });
  if (outcomeGroup?.id) rows.push({ group_id: outcomeGroup.id, contact_id: contact.id });
  if (rows.length) {
    await supabaseAdmin
      .from("contact_group_members")
      .upsert(rows, { onConflict: "group_id,contact_id" });
  }
}

// ---- Ban-protection knobs (tuned conservatively) ----
const PER_RECIPIENT_COOLDOWN_SEC = 60;     // min gap between sends to same number
const DEDUPE_WINDOW_SEC = 600;             // identical message+recipient within 10min => block
const PER_BRAND_PER_MINUTE = 20;           // soft cap, brand-wide
const PER_BRAND_PER_HOUR = 400;            // soft cap, brand-wide
const MIN_JITTER_MS = 250;
const MAX_JITTER_MS = 1200;

function hashMsg(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h.toString(36);
}

export const Route = createFileRoute("/api/public/plugin/send")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      POST: async ({ request }) => {
        const raw = await request.json().catch(() => null);
        const parsed = Body.safeParse(raw);
        if (!parsed.success) return jsonResponse({ error: "Invalid input" }, 400);

        const lic = await loadLicense(parsed.data.license_key);
        if (!lic || lic.status !== "active") return jsonResponse({ error: "License invalid" }, 403);
        if (!lic.device_id) return jsonResponse({ error: "No device selected for this license" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: device, error } = await supabaseAdmin
          .from("devices")
          .select("api_secret, device_unique_id, brand_id, status")
          .eq("id", lic.device_id)
          .maybeSingle();
        if (error || !device) return jsonResponse({ error: "Device not found" }, 404);
        if (device.status === "disconnected" || device.status === "inactive") {
          return jsonResponse({ error: "Device is not available" }, 503);
        }

        let recipient = parsed.data.recipient.trim();
        if (!recipient.startsWith("+")) recipient = "+880" + recipient.replace(/^0+/, "");
        // Strip everything but + and digits — defensive against junk that could be abused
        recipient = "+" + recipient.replace(/[^\d]/g, "");
        if (recipient.length < 8 || recipient.length > 18) {
          return jsonResponse({ error: "Invalid recipient" }, 400);
        }

        const brandId = device.brand_id ?? null;

        // 1) Blocked-number list (per brand)
        if (brandId) {
          const { data: blocked } = await supabaseAdmin
            .from("blocked_numbers")
            .select("id")
            .eq("brand_id", brandId)
            .eq("phone", recipient)
            .maybeSingle();
          if (blocked) return jsonResponse({ error: "Recipient is blocked" }, 403);
        }

        // 2) Pull recent plugin_send activity for rate-limit & dedupe checks
        const hourAgo = new Date(Date.now() - 3600_000).toISOString();
        const recentQ = supabaseAdmin
          .from("activity_log")
          .select("created_at, details")
          .eq("action", "plugin_send")
          .gte("created_at", hourAgo)
          .order("created_at", { ascending: false })
          .limit(1000);
        if (brandId) recentQ.eq("brand_id", brandId);
        const { data: recent } = await recentQ;
        const rows = (recent ?? []) as Array<{ created_at: string; details: any }>;

        const now = Date.now();
        const msgHash = hashMsg(parsed.data.message);

        let perMinute = 0;
        let perHour = rows.length;
        let lastToRecipient = 0;
        let dedupeHit = false;
        for (const r of rows) {
          const t = new Date(r.created_at).getTime();
          if (now - t <= 60_000) perMinute++;
          if (r.details?.recipient === recipient) {
            if (t > lastToRecipient) lastToRecipient = t;
            if (
              r.details?.msg_hash === msgHash &&
              now - t <= DEDUPE_WINDOW_SEC * 1000
            ) {
              dedupeHit = true;
            }
          }
        }

        if (dedupeHit) {
          return jsonResponse(
            { error: "Duplicate message suppressed (ban protection)" },
            429,
          );
        }
        if (lastToRecipient && now - lastToRecipient < PER_RECIPIENT_COOLDOWN_SEC * 1000) {
          const retry = Math.ceil((PER_RECIPIENT_COOLDOWN_SEC * 1000 - (now - lastToRecipient)) / 1000);
          return jsonResponse(
            { error: "Recipient cooldown active", retry_after: retry },
            429,
          );
        }
        if (perMinute >= PER_BRAND_PER_MINUTE) {
          return jsonResponse({ error: "Per-minute send limit reached", retry_after: 60 }, 429);
        }
        if (perHour >= PER_BRAND_PER_HOUR) {
          return jsonResponse({ error: "Hourly send limit reached", retry_after: 3600 }, 429);
        }

        // 3) Human-like jitter so bursts don't look bot-like
        const jitter = MIN_JITTER_MS + Math.floor(Math.random() * (MAX_JITTER_MS - MIN_JITTER_MS));
        await new Promise((r) => setTimeout(r, jitter));

        const { bdwebs } = await import("@/lib/bdwebs.server");
        const res = await bdwebs.sendWhatsApp({
          secret: device.api_secret,
          account: device.device_unique_id,
          recipient,
          message: parsed.data.message,
        });

        // Auto-add contact (best-effort)
        try {
          if (brandId) {
            await ensureContactInWordpressGroup(
              supabaseAdmin,
              brandId,
              recipient,
              parsed.data.customer_name,
              res.status === 200 ? "success" : "failed",
            );
          }
        } catch {
          // ignore bookkeeping errors
        }

        await supabaseAdmin.from("activity_log").insert({
          brand_id: brandId,
          action: "plugin_send",
          details: {
            recipient,
            status: res.status,
            message: res.message,
            license_id: lic.id,
            msg_hash: msgHash,
            jitter_ms: jitter,
          },
        });
        await supabaseAdmin
          .from("plugin_licenses")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", lic.id);

        if (res.status !== 200) return jsonResponse({ error: res.message || "Send failed" }, 502);
        return jsonResponse({ ok: true, message: res.message });
      },
    },
  },
});
