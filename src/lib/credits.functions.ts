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

// ---------- Authenticated: create a credit-topup order (pending approval) ----------
export const createCreditTopupOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        brand_id: z.string().uuid(),
        package_id: z.string().uuid(),
        amount_tk: z.number().positive().max(1_000_000),
        bkash_number: z.string().trim().min(8).max(30),
        txid: z.string().trim().min(4).max(64),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: brand } = await supabaseAdmin
      .from("brands").select("id, name, created_by").eq("id", data.brand_id).maybeSingle();
    if (!brand) throw new Error("Brand not found");
    const { data: member } = await supabaseAdmin
      .from("brand_members").select("role").eq("brand_id", data.brand_id).eq("user_id", context.userId).maybeSingle();
    const isAdmin = (member?.role === "brand_admin") || brand.created_by === context.userId;
    if (!isAdmin) throw new Error("Only the brand admin can top up");

    const { data: pkg } = await supabaseAdmin
      .from("credit_packages").select("*").eq("id", data.package_id).eq("is_active", true).maybeSingle();
    if (!pkg) throw new Error("Package not found");
    if (data.amount_tk < Number(pkg.min_topup_tk)) {
      throw new Error(`Minimum top-up for ${pkg.name} is ৳${pkg.min_topup_tk}`);
    }

    const { data: dup } = await supabaseAdmin.from("orders").select("id").eq("txid", data.txid).maybeSingle();
    if (dup) throw new Error("This bKash TXID has already been submitted.");

    const credits = Math.floor(data.amount_tk / Number(pkg.tk_per_credit));

    const { data: profile } = await supabaseAdmin
      .from("profiles").select("email, full_name, phone").eq("id", context.userId).maybeSingle();

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: context.userId,
        brand_id: data.brand_id,
        full_name: profile?.full_name ?? "",
        email: profile?.email ?? "",
        phone: profile?.phone ?? null,
        bkash_number: data.bkash_number,
        txid: data.txid,
        original_amount: data.amount_tk,
        discount_amount: 0,
        final_amount: data.amount_tk,
        status: "pending",
        kind: "credit_topup",
        credit_package_id: data.package_id,
        credits_purchased: credits,
      } as any)
      .select("id").single();
    if (error || !order) throw new Error(error?.message ?? "Could not create order");

    return { ok: true, order_id: order.id, credits };
  });

// ---------- Authenticated: create an add-on order (extra device / WP license / combo) ----------
export const createAddonOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        brand_id: z.string().uuid(),
        addon_kind: z.enum(["device", "wp_license", "combo"]),
        quantity: z.number().int().min(1).max(20).default(1),
        bkash_number: z.string().trim().min(8).max(30),
        txid: z.string().trim().min(4).max(64),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: brand } = await supabaseAdmin
      .from("brands").select("id, created_by").eq("id", data.brand_id).maybeSingle();
    if (!brand) throw new Error("Brand not found");
    const { data: member } = await supabaseAdmin
      .from("brand_members").select("role").eq("brand_id", data.brand_id).eq("user_id", context.userId).maybeSingle();
    const isAdmin = (member?.role === "brand_admin") || brand.created_by === context.userId;
    if (!isAdmin) throw new Error("Only the brand admin can purchase add-ons");

    const PRICES = { device: 400, wp_license: 400, combo: 700 } as const;
    const unit = PRICES[data.addon_kind];
    const total = unit * data.quantity;

    const { data: dup } = await supabaseAdmin.from("orders").select("id").eq("txid", data.txid).maybeSingle();
    if (dup) throw new Error("This bKash TXID has already been submitted.");

    const { data: profile } = await supabaseAdmin
      .from("profiles").select("email, full_name, phone").eq("id", context.userId).maybeSingle();

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: context.userId,
        brand_id: data.brand_id,
        full_name: profile?.full_name ?? "",
        email: profile?.email ?? "",
        phone: profile?.phone ?? null,
        bkash_number: data.bkash_number,
        txid: data.txid,
        original_amount: total,
        discount_amount: 0,
        final_amount: total,
        status: "pending",
        kind: "addon",
        addon_kind: data.addon_kind,
      } as any)
      .select("id").single();
    if (error || !order) throw new Error(error?.message ?? "Could not create order");

    return { ok: true, order_id: order.id, total };
  });
