import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertOwner(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "owner").maybeSingle();
  if (!data) throw new Error("Forbidden: owner only");
}

export const previewBrandAdminRecipients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Brand admins from brand_members
    const { data: bm } = await supabaseAdmin
      .from("brand_members").select("user_id").eq("role", "brand_admin");
    // Users with global brand_owner role
    const { data: br } = await supabaseAdmin
      .from("user_roles").select("user_id").eq("role", "brand_owner");
    // Brand creators (brand owners by ownership)
    const { data: bo } = await supabaseAdmin
      .from("brands").select("created_by");

    const ids = new Set<string>();
    (bm ?? []).forEach((r: any) => r.user_id && ids.add(r.user_id));
    (br ?? []).forEach((r: any) => r.user_id && ids.add(r.user_id));
    (bo ?? []).forEach((r: any) => r.created_by && ids.add(r.created_by));
    if (ids.size === 0) return { recipients: [] as { id: string; full_name: string | null; phone: string | null; email: string | null }[] };

    const { data: profiles } = await supabaseAdmin
      .from("profiles").select("id, full_name, phone, email").in("id", Array.from(ids));
    return { recipients: profiles ?? [] };
  });

export const sendBrandAdminNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ message: z.string().min(1).max(4000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { sendWhatsApp } = await import("@/lib/notify.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

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
    if (ids.size === 0) return { sent: 0, failed: 0, skipped: 0, total: 0 };

    const { data: profiles } = await supabaseAdmin
      .from("profiles").select("id, full_name, phone").in("id", Array.from(ids));

    let sent = 0, failed = 0, skipped = 0;
    for (const p of profiles ?? []) {
      const phone = (p as any).phone as string | null;
      if (!phone || phone.replace(/\D+/g, "").length < 8) { skipped++; continue; }
      const ok = await sendWhatsApp(phone, data.message);
      if (ok) sent++; else failed++;
    }
    return { sent, failed, skipped, total: (profiles ?? []).length };
  });
