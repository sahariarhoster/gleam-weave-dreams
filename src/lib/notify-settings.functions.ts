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

export const getNotifySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("system_settings")
      .select("notify_phone, notify_device_id")
      .limit(1)
      .maybeSingle();
    const { data: devices } = await supabaseAdmin
      .from("devices")
      .select("id, name, status, device_unique_id")
      .order("created_at", { ascending: false });
    return {
      notify_phone: (data?.notify_phone ?? "") as string,
      notify_device_id: (data?.notify_device_id ?? null) as string | null,
      devices: devices ?? [],
    };
  });

export const saveNotifySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      notify_phone: z.string().trim().min(8).max(30),
      notify_device_id: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await assertOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("system_settings").select("id").limit(1).maybeSingle();
    if (existing) {
      await supabaseAdmin.from("system_settings")
        .update({ notify_phone: data.notify_phone, notify_device_id: data.notify_device_id })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("system_settings").insert({
        notify_phone: data.notify_phone,
        notify_device_id: data.notify_device_id,
      });
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
