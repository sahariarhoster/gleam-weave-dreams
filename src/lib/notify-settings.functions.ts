import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertOwner(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: owners only");
}

export const DEFAULT_TEMPLATES = {
  tpl_order_placed:
    "Hi {name},\n\n✅ Your order for *{package}* has been received.\n\nAmount: {amount} BDT\nTXID: {txid}\n\nYour account is *pending approval*. You'll get another message as soon as it's activated.\n\nThank you!",
  tpl_order_approved:
    "🎉 Hi {name},\n\nYour account has been *activated*!\nPackage: {package}\nValid for: {days} days\n\nYou can now log in and start using the service.",
  tpl_order_admin:
    "🆕 *New Order*\n\nCustomer: {name} ({email})\nPhone: {phone}\nBrand: {brand}\nPackage: {package}\nAmount: {amount} BDT\nbKash: {bkash}\nTXID: {txid}",
};

export const getNotifySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("system_settings")
      .select("notify_phone, notify_device_id, admin_notify_numbers, tpl_order_placed, tpl_order_approved, tpl_order_admin")
      .limit(1)
      .maybeSingle();
    const { data: devices } = await supabaseAdmin
      .from("devices")
      .select("id, name, status, device_unique_id")
      .order("created_at", { ascending: false });
    const d = data as any;
    return {
      notify_phone: (d?.notify_phone ?? "") as string,
      notify_device_id: (d?.notify_device_id ?? null) as string | null,
      admin_notify_numbers: (d?.admin_notify_numbers ?? "") as string,
      tpl_order_placed: (d?.tpl_order_placed ?? DEFAULT_TEMPLATES.tpl_order_placed) as string,
      tpl_order_approved: (d?.tpl_order_approved ?? DEFAULT_TEMPLATES.tpl_order_approved) as string,
      tpl_order_admin: (d?.tpl_order_admin ?? DEFAULT_TEMPLATES.tpl_order_admin) as string,
      devices: devices ?? [],
    };
  });

export const saveNotifySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      notify_phone: z.string().trim().min(8).max(30),
      notify_device_id: z.string().uuid(),
      admin_notify_numbers: z.string().trim().max(2000).optional().default(""),
      tpl_order_placed: z.string().trim().max(2000).optional().default(""),
      tpl_order_approved: z.string().trim().max(2000).optional().default(""),
      tpl_order_admin: z.string().trim().max(2000).optional().default(""),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("system_settings").select("id").limit(1).maybeSingle();
    const payload: any = {
      notify_phone: data.notify_phone,
      notify_device_id: data.notify_device_id,
      admin_notify_numbers: data.admin_notify_numbers ?? "",
      tpl_order_placed: data.tpl_order_placed || DEFAULT_TEMPLATES.tpl_order_placed,
      tpl_order_approved: data.tpl_order_approved || DEFAULT_TEMPLATES.tpl_order_approved,
      tpl_order_admin: data.tpl_order_admin || DEFAULT_TEMPLATES.tpl_order_admin,
    };
    if (existing) {
      await supabaseAdmin.from("system_settings").update(payload).eq("id", existing.id);
    } else {
      await supabaseAdmin.from("system_settings").insert(payload);
    }
    return { ok: true };
  });

export const sendDailyReportNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.supabase, context.userId);
    const { runDailyReport } = await import("./daily-report.server");
    const r = await runDailyReport();
    return { ok: r.ok, error: r.error ?? null, message: r.message ?? null, sent: r.sent ?? false };
  });
