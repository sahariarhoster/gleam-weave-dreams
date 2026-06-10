// Shared WhatsApp notification helpers (server-only).
// Uses the device configured in system_settings.notify_device_id.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bdwebs } from "@/lib/bdwebs.server";

async function getSender() {
  const { data: settings } = await supabaseAdmin
    .from("system_settings")
    .select("notify_phone, notify_device_id, admin_notify_numbers")
    .limit(1)
    .maybeSingle();
  if (!settings?.notify_device_id) return null;
  const { data: device } = await supabaseAdmin
    .from("devices")
    .select("api_secret, device_unique_id, status")
    .eq("id", settings.notify_device_id)
    .maybeSingle();
  if (!device?.api_secret || !device?.device_unique_id) return null;
  if (device.status === "disconnected" || device.status === "inactive") return null;
  return { settings, device };
}

function normalize(num: string): string {
  return num.replace(/[^0-9+]/g, "");
}

const DEFAULTS = {
  tpl_order_placed:
    "Hi {name},\n\n✅ Your order for *{package}* has been received.\n\nAmount: {amount} BDT\nTXID: {txid}\n\nYour account is *pending approval*. You'll get another message as soon as it's activated.\n\nThank you!",
  tpl_order_approved:
    "🎉 Hi {name},\n\nYour account has been *activated*!\nPackage: {package}\nValid for: {days} days\n\nYou can now log in and start using the service.",
  tpl_order_admin:
    "🆕 *New Order*\n\nCustomer: {name} ({email})\nPhone: {phone}\nBrand: {brand}\nPackage: {package}\nAmount: {amount} BDT\nbKash: {bkash}\nTXID: {txid}",
};

export function fillTemplate(tpl: string, vars: Record<string, string | number | null | undefined>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : String(v);
  });
}

export async function getOrderTemplate(key: "tpl_order_placed" | "tpl_order_approved" | "tpl_order_admin"): Promise<string> {
  const { data } = await supabaseAdmin
    .from("system_settings")
    .select(key)
    .limit(1)
    .maybeSingle();
  return ((data as any)?.[key] as string | null) || DEFAULTS[key];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = () => 10000 + Math.floor(Math.random() * 13000); // 10–23s

async function logSend(recipient: string, ok: boolean, info: any) {
  try {
    await supabaseAdmin.from("activity_log").insert({
      action: "admin_notify",
      details: { recipient, status: ok ? 200 : 500, ...info },
    });
  } catch { /* ignore */ }
}

export async function sendWhatsApp(recipient: string, message: string): Promise<boolean> {
  try {
    const s = await getSender();
    if (!s) {
      await logSend(recipient, false, { error: "no_sender_device", jitter_ms: 0 });
      return false;
    }
    const to = normalize(recipient);
    if (!to) {
      await logSend(recipient, false, { error: "invalid_recipient", jitter_ms: 0 });
      return false;
    }
    const j = jitter();
    await sleep(j);
    const res = await bdwebs.sendWhatsApp({
      secret: s.device.api_secret,
      account: s.device.device_unique_id,
      recipient: to,
      message,
    });
    const ok = res.status === 200;
    await logSend(to, ok, { jitter_ms: j, response: res?.message ?? null, status: res?.status });
    return ok;
  } catch (e: any) {
    await logSend(recipient, false, { error: String(e?.message ?? e), jitter_ms: 0 });
    return false;
  }
}

/** Sends to system admin (notify_phone) + every entry in admin_notify_numbers. */
export async function notifyAdmins(message: string): Promise<void> {
  try {
    const s = await getSender();
    if (!s) return;
    const recipients = new Set<string>();
    if (s.settings.notify_phone) recipients.add(normalize(s.settings.notify_phone));
    const list = (s.settings.admin_notify_numbers ?? "")
      .split(/[,\n;]/)
      .map((x: string) => normalize(x.trim()))
      .filter((x: string) => x.length >= 8);
    for (const n of list) recipients.add(n);
    for (const r of recipients) {
      const j = jitter();
      await sleep(j);
      try {
        const res = await bdwebs.sendWhatsApp({
          secret: s.device.api_secret,
          account: s.device.device_unique_id,
          recipient: r,
          message,
        });
        await logSend(r, res.status === 200, { jitter_ms: j, response: res?.message ?? null, status: res?.status, admin: true });
      } catch (e: any) {
        await logSend(r, false, { jitter_ms: j, error: String(e?.message ?? e), admin: true });
      }
    }
  } catch {
    // swallow — notifications must never break the main flow
  }
}
