import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Public: list active credit packages ----------
export const listCreditPackages = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("credit_packages")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

// ---------- Brand member: get wallet for a brand ----------
export const getWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ brand_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: brand } = await context.supabase
      .from("brands")
      .select("id, name, pricing_model, trial_used_at, message_limit, device_limit, license_limit")
      .eq("id", data.brand_id)
      .maybeSingle();
    if (!brand) throw new Error("Brand not found");
    const { data: wallet } = await context.supabase
      .from("credit_wallets")
      .select("*, credit_packages(name, code, tk_per_credit, min_topup_tk, device_limit, wp_site_limit)")
      .eq("brand_id", data.brand_id)
      .maybeSingle();
    return { brand, wallet };
  });

// ---------- Brand member: list recent transactions ----------
export const listCreditTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ brand_id: z.string().uuid(), limit: z.number().int().min(1).max(200).default(50) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: txns, error } = await context.supabase
      .from("credit_transactions")
      .select("*")
      .eq("brand_id", data.brand_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return txns ?? [];
  });

// ---------- Owner: list ALL credit packages (incl inactive) ----------
export const adminListCreditPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
    if (!role) throw new Error("Owner only");
    const { data } = await context.supabase
      .from("credit_packages")
      .select("*")
      .order("sort_order", { ascending: true });
    return data ?? [];
  });

// ---------- Owner: upsert credit package ----------
export const adminUpsertCreditPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional().nullable(),
        code: z.string().trim().min(1).max(50),
        name: z.string().trim().min(1).max(100),
        tk_per_credit: z.number().positive().max(1000),
        min_topup_tk: z.number().positive().max(1000000),
        device_limit: z.number().int().min(1).max(100),
        wp_site_limit: z.number().int().min(1).max(100),
        is_active: z.boolean().default(true),
        sort_order: z.number().int().default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
    if (!role) throw new Error("Owner only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      code: data.code,
      name: data.name,
      tk_per_credit: data.tk_per_credit,
      min_topup_tk: data.min_topup_tk,
      device_limit: data.device_limit,
      wp_site_limit: data.wp_site_limit,
      is_active: data.is_active,
      sort_order: data.sort_order,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("credit_packages").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("credit_packages").insert(payload as any);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ---------- Owner: manual credit adjustment ----------
export const adminAdjustCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        brand_id: z.string().uuid(),
        credits: z.number().int(),
        note: z.string().trim().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
    if (!role) throw new Error("Owner only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: w } = await supabaseAdmin
      .from("credit_wallets")
      .select("id, balance, expires_at")
      .eq("brand_id", data.brand_id)
      .maybeSingle();
    const newBal = Math.max(0, (w?.balance ?? 0) + data.credits);
    if (w) {
      await supabaseAdmin.from("credit_wallets").update({ balance: newBal }).eq("id", w.id);
    } else {
      const expires = new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabaseAdmin.from("credit_wallets").insert({ brand_id: data.brand_id, balance: newBal, expires_at: expires } as any);
    }
    await supabaseAdmin.from("credit_transactions").insert({
      brand_id: data.brand_id,
      type: "adjustment",
      credits: data.credits,
      balance_after: newBal,
      note: data.note ?? "Manual adjustment",
      created_by: context.userId,
    } as any);
    return { ok: true, balance: newBal };
  });

// ---------- Owner: update low-balance settings ----------
export const adminGetLowBalanceSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: role } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
    if (!role) throw new Error("Owner only");
    const { data } = await context.supabase
      .from("system_settings")
      .select("id, low_balance_threshold, low_balance_wa_template, zero_balance_wa_template")
      .limit(1)
      .maybeSingle();
    return data;
  });

export const adminUpdateLowBalanceSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        low_balance_threshold: z.number().int().min(0).max(100000),
        low_balance_wa_template: z.string().max(2000).optional().nullable(),
        zero_balance_wa_template: z.string().max(2000).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: role } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
    if (!role) throw new Error("Owner only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("system_settings")
      .update({
        low_balance_threshold: data.low_balance_threshold,
        low_balance_wa_template: data.low_balance_wa_template ?? null,
        zero_balance_wa_template: data.zero_balance_wa_template ?? null,
      } as any)
      .eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
