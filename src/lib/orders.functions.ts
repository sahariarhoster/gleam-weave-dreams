import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Public: list active packages
export const listActivePackages = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("packages")
    .select("id, name, description, price, duration_days, device_limit, message_limit, license_count, is_trial, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("price", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

// Public: validate coupon
export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ code: z.string().min(1).max(64), amount: z.number().min(0) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: res, error } = await supabaseAdmin.rpc("validate_coupon", {
      _code: data.code,
      _amount: data.amount,
    });
    if (error) throw new Error(error.message);
    return res as { valid: boolean; error?: string; id?: string; code?: string; discount?: number; final?: number };
  });

// Public: create order. Creates auth user (or links existing), pending brand, and order.
export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        package_id: z.string().uuid(),
        full_name: z.string().trim().min(2).max(100),
        email: z.string().trim().email().max(255),
        password: z.string().min(6).max(72),
        phone: z.string().trim().max(30).optional().nullable(),
        brand_name: z.string().trim().min(1).max(100),
        bkash_number: z.string().trim().max(30).optional().nullable(),
        txid: z.string().trim().max(64).optional().nullable(),
        coupon_code: z.string().trim().max(64).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch package
    const { data: pkg, error: pErr } = await supabaseAdmin
      .from("packages")
      .select("*")
      .eq("id", data.package_id)
      .eq("is_active", true)
      .maybeSingle();
    if (pErr || !pkg) throw new Error("Package not found");

    // Validate coupon if provided
    let couponId: string | null = null;
    let discount = 0;
    if (data.coupon_code && data.coupon_code.trim()) {
      const { data: cres, error: cErr } = await supabaseAdmin.rpc("validate_coupon", {
        _code: data.coupon_code,
        _amount: Number(pkg.price),
      });
      if (cErr) throw new Error(cErr.message);
      const r = cres as any;
      if (!r?.valid) throw new Error(r?.error ?? "Invalid coupon");
      couponId = r.id;
      discount = Number(r.discount ?? 0);
    }
    const original = Number(pkg.price);
    const final = Math.max(original - discount, 0);
    const requirePayment = final > 0;
    if (requirePayment) {
      if (!data.bkash_number || data.bkash_number.trim().length < 8) throw new Error("bKash number required");
      if (!data.txid || data.txid.trim().length < 4) throw new Error("Transaction ID required");
    }

    // Duplicate TXID guard
    if (data.txid && data.txid.trim()) {
      const { data: dup } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("txid", data.txid)
        .maybeSingle();
      if (dup) throw new Error("This bKash TXID has already been submitted.");
    }

    // Create or reuse auth user
    let userId: string;
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = (list?.users ?? []).find(
      (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
    );
    if (existing) {
      userId = existing.id;
    } else {
      const { data: created, error: cuErr } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.full_name },
      });
      if (cuErr || !created.user) throw new Error(cuErr?.message ?? "Could not create account");
      userId = created.user.id;
    }

    // Ensure profile + brand_owner role
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: userId, email: data.email, full_name: data.full_name }, { onConflict: "id" });
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "brand_owner" }, { onConflict: "user_id,role" });

    // Create pending brand
    const { data: brand, error: bErr } = await supabaseAdmin
      .from("brands")
      .insert({
        name: data.brand_name,
        status: "pending" as any,
        message_limit: pkg.message_limit,
        device_limit: pkg.device_limit,
        license_limit: pkg.license_count,
        created_by: userId,
      } as any)
      .select("id")
      .single();
    if (bErr || !brand) throw new Error(bErr?.message ?? "Could not create brand");

    await supabaseAdmin
      .from("brand_members")
      .upsert(
        { brand_id: brand.id, user_id: userId, role: "brand_admin" },
        { onConflict: "brand_id,user_id" },
      );

    // Create order
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        package_id: pkg.id,
        user_id: userId,
        brand_id: brand.id,
        coupon_id: couponId,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone ?? null,
        bkash_number: data.bkash_number ?? null,
        txid: data.txid ?? null,
        original_amount: original,
        discount_amount: discount,
        final_amount: final,
        status: "pending",
      })
      .select("id")
      .single();
    if (oErr || !order) throw new Error(oErr?.message ?? "Could not create order");

    // Best-effort WhatsApp notifications (never break the order flow)
    try {
      const { sendWhatsApp, notifyAdmins } = await import("@/lib/notify.server");
      if (data.phone) {
        await sendWhatsApp(
          data.phone,
          `Hi ${data.full_name},\n\n` +
            `✅ Your order for *${pkg.name}* has been received.\n\n` +
            `Amount: ${final} BDT\nTXID: ${data.txid}\n\n` +
            `Your account is *pending approval*. You'll get another message as soon as it's activated.\n\nThank you!`,
        );
      }
      await notifyAdmins(
        `🆕 *New Order*\n\n` +
          `Customer: ${data.full_name} (${data.email})\n` +
          `Phone: ${data.phone ?? "—"}\n` +
          `Brand: ${data.brand_name}\n` +
          `Package: ${pkg.name}\n` +
          `Amount: ${final} BDT\nbKash: ${data.bkash_number}\nTXID: ${data.txid}`,
      );
    } catch {
      // ignore
    }

    return { ok: true, order_id: order.id };
  });

// Owner: list all orders
export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select(
        "id, full_name, email, phone, bkash_number, txid, original_amount, discount_amount, final_amount, status, admin_notes, approved_at, created_at, package_id, brand_id, packages(name, duration_days), brands(name, status)",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
      ...r,
      package_name: r.packages?.name,
      duration_days: r.packages?.duration_days,
      brand_name: r.brands?.name,
      brand_status: r.brands?.status,
    }));
  });

// Owner: approve or reject
export const decideOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
        notes: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).in("role", ["owner", "support_agent"]);
    if (!roleRow || roleRow.length === 0) throw new Error("Owner only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .select("id, brand_id, coupon_id, status, package_id, packages(duration_days)")
      .eq("id", data.id)
      .maybeSingle();
    if (oErr || !order) throw new Error("Order not found");
    if (order.status !== "pending") throw new Error("Order already decided");

    if (data.action === "approve") {
      const days = (order as any).packages?.duration_days ?? 30;
      const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      if (order.brand_id) {
        await supabaseAdmin
          .from("brands")
          .update({ status: "active", expires_at: expires })
          .eq("id", order.brand_id);
      }
      if (order.coupon_id) {
        // increment used_count
        const { data: c } = await supabaseAdmin
          .from("coupons").select("used_count").eq("id", order.coupon_id).maybeSingle();
        await supabaseAdmin
          .from("coupons")
          .update({ used_count: (c?.used_count ?? 0) + 1 })
          .eq("id", order.coupon_id);
      }
      await supabaseAdmin
        .from("orders")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
          approved_by: context.userId,
          admin_notes: data.notes ?? null,
        })
        .eq("id", data.id);

      // Notify customer that account is activated
      try {
        const { data: full } = await supabaseAdmin
          .from("orders")
          .select("full_name, phone, packages(name)")
          .eq("id", data.id)
          .maybeSingle();
        if (full?.phone) {
          const { sendWhatsApp } = await import("@/lib/notify.server");
          await sendWhatsApp(
            full.phone,
            `🎉 Hi ${full.full_name},\n\n` +
              `Your account has been *activated*!\n` +
              `Package: ${(full as any)?.packages?.name ?? ""}\n` +
              `Valid for: ${days} days\n\n` +
              `You can now log in and start using the service.`,
          );
        }
      } catch { /* ignore */ }
    } else {
      // reject: keep brand as pending (or could delete). We'll mark brand suspended.
      if (order.brand_id) {
        await supabaseAdmin.from("brands").update({ status: "suspended" }).eq("id", order.brand_id);
      }
      await supabaseAdmin
        .from("orders")
        .update({
          status: "rejected",
          approved_at: new Date().toISOString(),
          approved_by: context.userId,
          admin_notes: data.notes ?? null,
        })
        .eq("id", data.id);
    }
    return { ok: true };
  });

// Owner: packages CRUD
export const listAllPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("packages").select("*").order("sort_order").order("price");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional().nullable(),
        name: z.string().trim().min(1).max(100),
        description: z.string().trim().max(500).optional().nullable(),
        price: z.number().min(0).max(1000000),
        duration_days: z.number().int().min(1).max(3650),
        device_limit: z.number().int().min(1).max(100),
        message_limit: z.number().int().min(0).nullable().optional(),
        license_count: z.number().int().min(1).max(100),
        is_trial: z.boolean().default(false),
        is_active: z.boolean().default(true),
        sort_order: z.number().int().default(0),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "owner").maybeSingle();
    if (!roleRow) throw new Error("Owner only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      name: data.name,
      description: data.description ?? null,
      price: data.price,
      duration_days: data.duration_days,
      device_limit: data.device_limit,
      message_limit: data.message_limit ?? null,
      license_count: data.license_count,
      is_trial: data.is_trial,
      is_active: data.is_active,
      sort_order: data.sort_order,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("packages").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("packages").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deletePackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "owner").maybeSingle();
    if (!roleRow) throw new Error("Owner only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("packages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Owner: coupons CRUD
export const listCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("coupons").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional().nullable(),
        code: z.string().trim().min(2).max(64).regex(/^[A-Za-z0-9_-]+$/),
        discount_type: z.enum(["percent", "fixed"]),
        discount_value: z.number().min(0).max(1000000),
        max_uses: z.number().int().min(1).nullable().optional(),
        expires_at: z.string().nullable().optional(),
        is_active: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).in("role", ["owner", "support_agent"]);
    if (!roleRow || roleRow.length === 0) throw new Error("Owner only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      code: data.code.toUpperCase(),
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      max_uses: data.max_uses ?? null,
      expires_at: data.expires_at ?? null,
      is_active: data.is_active,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("coupons").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("coupons").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).in("role", ["owner", "support_agent"]);
    if (!roleRow || roleRow.length === 0) throw new Error("Owner only");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// User: check if my brands are pending → show locked screen
export const getMyAccountStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // If user is owner, never locked
    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    const roles = (roleRow ?? []).map((r: any) => r.role);
    if (roles.includes("owner")) return { locked: false, roles, brands: [] };

    const { data: brands } = await context.supabase
      .from("brands").select("id, name, status").eq("created_by", context.userId);
    const list = brands ?? [];
    const allPending = list.length > 0 && list.every((b: any) => b.status === "pending");
    return { locked: allPending, roles, brands: list };
  });
