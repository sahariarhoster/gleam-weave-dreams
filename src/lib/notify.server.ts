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

export async function sendWhatsApp(recipient: string, message: string): Promise<boolean> {
  try {
    const s = await getSender();
    if (!s) return false;
    const to = normalize(recipient);
    if (!to) return false;
    const res = await bdwebs.sendWhatsApp({
      secret: s.device.api_secret,
      account: s.device.device_unique_id,
      recipient: to,
      message,
    });
    return res.status === 200;
  } catch {
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
      try {
        await bdwebs.sendWhatsApp({
          secret: s.device.api_secret,
          account: s.device.device_unique_id,
          recipient: r,
          message,
        });
      } catch {
        // continue
      }
    }
  } catch {
    // swallow — notifications must never break the main flow
  }
}
