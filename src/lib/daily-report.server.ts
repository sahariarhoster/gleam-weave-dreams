import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bdwebs } from "@/lib/bdwebs.server";

function bdDateStr(offsetDays = 0) {
  // Asia/Dhaka = UTC+6 (no DST)
  const now = new Date();
  const bd = new Date(now.getTime() + 6 * 3600 * 1000);
  bd.setUTCDate(bd.getUTCDate() + offsetDays);
  return bd.toISOString().slice(0, 10);
}

export async function runDailyReport() {
  const { data: ownerRow } = await supabaseAdmin
    .from("user_roles").select("user_id").eq("role", "owner").limit(1).maybeSingle();
  if (!ownerRow) return { ok: false, error: "no_owner" };

  const dateStr = bdDateStr(-1);

  const { data: stats, error } = await supabaseAdmin.rpc("get_report_stats_for_user", {
    _user_id: ownerRow.user_id,
    _start: dateStr,
    _end: dateStr,
    _brand_id: undefined,
  });
  if (error) return { ok: false, error: error.message };

  const s = stats as any;
  const t = s?.totals ?? { sent: 0, failed: 0, total: 0, successRate: 0 };
  const brands = (s?.brands ?? []) as Array<any>;
  const failureRate = t.total > 0 ? Math.round((t.failed / t.total) * 1000) / 10 : 0;

  // Extra context
  const [{ count: deviceCount }, { count: onlineCount }, { count: activeBrands }] = await Promise.all([
    supabaseAdmin.from("devices").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("devices").select("*", { count: "exact", head: true }).in("status", ["active", "online"] as any),
    supabaseAdmin.from("brands").select("*", { count: "exact", head: true }).eq("status", "active" as any),
  ]);

  const activeBrandCount = brands.filter((b) => b.total > 0).length;
  const sorted = [...brands].sort((a, b) => b.total - a.total);
  const topBrand = sorted[0];
  const worstBrand = [...brands].filter((b) => b.total > 0)
    .sort((a, b) => a.successRate - b.successRate)[0];

  const lines: string[] = [];
  lines.push(`📊 *Daily Report — ${dateStr}*`);
  lines.push(`_Timezone: Asia/Dhaka_`);
  lines.push("");
  lines.push(`*Summary*`);
  lines.push(`• Total SMS Sent: *${t.total}*`);
  lines.push(`• ✅ Success: ${t.sent} (${t.successRate}%)`);
  lines.push(`• ❌ Failed: ${t.failed} (${failureRate}%)`);
  lines.push("");
  lines.push(`*System*`);
  lines.push(`• Devices: ${deviceCount ?? 0} (online ${onlineCount ?? 0})`);
  lines.push(`• Active brands: ${activeBrands ?? 0}`);
  lines.push(`• Brands with activity today: ${activeBrandCount}`);
  if (topBrand) lines.push(`• 🏆 Top brand: ${topBrand.name} (${topBrand.total} sms)`);
  if (worstBrand && worstBrand.id !== topBrand?.id) {
    lines.push(`• ⚠️ Lowest success: ${worstBrand.name} (${worstBrand.successRate}%)`);
  }
  lines.push("");
  lines.push(`*SMS Per Brand*`);
  if (brands.length === 0) {
    lines.push("(no activity)");
  } else {
    for (const b of sorted) {
      const fr = b.total > 0 ? Math.round((b.failed / b.total) * 1000) / 10 : 0;
      lines.push(`• *${b.name}*`);
      lines.push(`   sms ${b.total} | ✅ ${b.sent} (${b.successRate}%) | ❌ ${b.failed} (${fr}%)`);
    }
  }
  const message = lines.join("\n");

  const { data: settings } = await supabaseAdmin
    .from("system_settings")
    .select("notify_phone, notify_device_id")
    .limit(1).maybeSingle();

  if (!settings?.notify_phone || !settings?.notify_device_id) {
    return { ok: false, error: "notify_not_configured", message };
  }

  const { data: device } = await supabaseAdmin
    .from("devices")
    .select("device_unique_id, api_secret")
    .eq("id", settings.notify_device_id)
    .maybeSingle();

  if (!device?.api_secret || !device?.device_unique_id) {
    return { ok: false, error: "device_not_ready", message };
  }

  const send = await bdwebs.sendWhatsApp({
    secret: device.api_secret,
    account: device.device_unique_id,
    recipient: settings.notify_phone,
    message,
  });

  await supabaseAdmin.from("activity_log").insert({
    action: "daily_report_sent",
    details: { date: dateStr, status: send.status, message_preview: message.slice(0, 200) },
  });

  return { ok: true, sent: send.status === 200, gateway: send, message };
}
