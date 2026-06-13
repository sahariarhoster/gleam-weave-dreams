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
        phone: z.string().trim().min(6).max(30),
        brand_name: z.string().trim().min(1).max(100),
        bkash_number: z.string().trim().max(30).optional().nullable(),
        txid: z.string().trim().max(64).optional().nullable(),
        coupon_code: z.string().trim().max(64).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Capture client IP from request headers
    let ip: string | null = null;
    try {
      const { getRequestIP } = await import("@tanstack/react-start/server");
      ip = getRequestIP({ xForwardedFor: true }) ?? null;
    } catch {
      ip = null;
    }


    // Rate limit: same phone or IP can only order once per 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const normPhone = data.phone.replace(/\D/g, "");
    if (normPhone) {
      const { data: recentPhone } = await supabaseAdmin
        .from("orders")
        .select("id, created_at")
        .eq("phone", data.phone)
        .gte("created_at", sevenDaysAgo)
        .limit(1);
      if (recentPhone && recentPhone.length > 0) {
        throw new Error("You've already placed an order with this phone number in the last 7 days. Please wait or contact support.");
      }
    }
    if (ip) {
      const { data: recentIp } = await supabaseAdmin
        .from("orders")
        .select("id, created_at")
        .eq("ip_address", ip)
        .gte("created_at", sevenDaysAgo)
        .limit(1);
      if (recentIp && recentIp.length > 0) {
        throw new Error("An order was already placed from this network in the last 7 days. Please wait or contact support.");
      }
    }

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
      .upsert({ id: userId, email: data.email, full_name: data.full_name, phone: data.phone } as any, { onConflict: "id" });
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
        bkash_number: data.bkash_number ?? "",
        txid: data.txid ?? "",
        original_amount: original,
        discount_amount: discount,
        final_amount: final,
        status: "pending",
        ip_address: ip,
      })

      .select("id")
      .single();
    if (oErr || !order) throw new Error(oErr?.message ?? "Could not create order");

    // Best-effort WhatsApp notifications (never break the order flow)
    try {
      const { sendWhatsApp, notifyAdmins, getOrderTemplate, fillTemplate } = await import("@/lib/notify.server");
      const vars = {
        name: data.full_name,
        email: data.email,
        phone: data.phone ?? "—",
        brand: data.brand_name,
        package: pkg.name,
        amount: final,
        bkash: data.bkash_number ?? "—",
        txid: data.txid ?? "—",
      };
      if (data.phone) {
        const tpl = await getOrderTemplate("tpl_order_placed");
        await sendWhatsApp(data.phone, fillTemplate(tpl, vars));
      }
      const adminTpl = await getOrderTemplate("tpl_order_admin");
      await notifyAdmins(fillTemplate(adminTpl, vars));
    } catch {
      // ignore
    }

    return { ok: true, order_id: order.id };
  });

// Owner: list all orders
export const listOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId)
      .in("role", ["owner", "support_agent"]);
    if (!roleRow || roleRow.length === 0) throw new Error("Forbidden");
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
        action: z.enum(["approve", "reject", "cancel"]),
        notes: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .select("id, brand_id, coupon_id, status, package_id, user_id, packages(duration_days, message_limit, device_limit, license_count)")
      .eq("id", data.id)
      .maybeSingle();
    if (oErr || !order) throw new Error("Order not found");

    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).in("role", ["owner", "support_agent"]);
    const isStaff = !!roleRow && roleRow.length > 0;
    const isOwnerOfOrder = order.user_id === context.userId;

    if (data.action === "cancel") {
      if (!isStaff && !isOwnerOfOrder) throw new Error("Not allowed");
    } else if (!isStaff) {
      throw new Error("Owner only");
    }

    if (data.action === "reject" && (!data.notes || data.notes.trim().length < 3)) {
      throw new Error("A reason is required when rejecting an order.");
    }

    const wasApproved = order.status === "approved";

    if (data.action === "approve") {
      const pkgInfo = (order as any).packages ?? {};
      const days = pkgInfo.duration_days ?? 30;
      const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      if (order.brand_id) {
        await supabaseAdmin
          .from("brands")
          .update({
            status: "active",
            expires_at: expires,
            current_package_id: order.package_id,
            message_limit: pkgInfo.message_limit ?? null,
            device_limit: pkgInfo.device_limit ?? null,
            license_limit: pkgInfo.license_count ?? null,
            cancel_requested_at: null,
          } as any)
          .eq("id", order.brand_id);
      }
      if (order.coupon_id && !wasApproved) {
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

      try {
        const { data: full } = await supabaseAdmin
          .from("orders")
          .select("full_name, phone, packages(name)")
          .eq("id", data.id)
          .maybeSingle();
        if (full?.phone) {
          const { sendWhatsApp, getOrderTemplate, fillTemplate } = await import("@/lib/notify.server");
          const tpl = await getOrderTemplate("tpl_order_approved");
          await sendWhatsApp(
            full.phone,
            fillTemplate(tpl, {
              name: full.full_name,
              package: (full as any)?.packages?.name ?? "",
              days,
            }),
          );
        }
      } catch { /* ignore */ }
    } else {
      const newStatus = data.action === "cancel" ? "cancelled" : "rejected";
      if (order.brand_id) {
        await supabaseAdmin.from("brands").update({ status: "suspended" }).eq("id", order.brand_id);
      }
      // If we're reversing a previously-approved order, decrement coupon usage.
      if (wasApproved && order.coupon_id) {
        const { data: c } = await supabaseAdmin
          .from("coupons").select("used_count").eq("id", order.coupon_id).maybeSingle();
        await supabaseAdmin
          .from("coupons")
          .update({ used_count: Math.max((c?.used_count ?? 1) - 1, 0) })
          .eq("id", order.coupon_id);
      }
      await supabaseAdmin
        .from("orders")
        .update({
          status: newStatus,
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

// User: check if my brands are pending/suspended/on_hold/expired → lock the panel
export const getMyAccountStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId);
    const roles = (roleRow ?? []).map((r: any) => r.role);
    if (roles.includes("owner")) return { locked: false, roles, brands: [], reason: null as string | null };

    const { data: brands } = await context.supabase
      .from("brands").select("id, name, status").eq("created_by", context.userId);
    const list = brands ?? [];
    if (list.length === 0) return { locked: false, roles, brands: list, reason: null };
    const hasActive = list.some((b: any) => b.status === "active");
    if (hasActive) return { locked: false, roles, brands: list, reason: null, note: null as string | null };
    const order = ["on_hold", "suspended", "expired", "pending"];
    const reason = order.find((s) => list.some((b: any) => b.status === s)) ?? list[0].status;
    // Pull latest admin note from the user's most recent order so rejection/cancel
    // reasons surface on the lock screen.
    const { data: lastOrder } = await context.supabase
      .from("orders")
      .select("admin_notes, status")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return { locked: true, roles, brands: list, reason, note: lastOrder?.admin_notes ?? null };
  });

// Owner/staff: manually create an order (and optionally auto-approve into an active subscription)
export const adminCreateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        package_id: z.string().uuid(),
        full_name: z.string().trim().min(2).max(100),
        email: z.string().trim().email().max(255),
        password: z.string().min(6).max(72).optional().nullable(),
        phone: z.string().trim().max(30).optional().nullable(),
        brand_name: z.string().trim().min(1).max(100),
        brand_id: z.string().uuid().optional().nullable(),
        user_id: z.string().uuid().optional().nullable(),
        bkash_number: z.string().trim().max(30).optional().nullable(),
        txid: z.string().trim().max(64).optional().nullable(),
        notes: z.string().trim().max(500).optional().nullable(),
        auto_approve: z.boolean().default(true),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId)
      .in("role", ["owner", "support_agent", "sales_agent"]);
    if (!roleRow || roleRow.length === 0) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: pkg, error: pErr } = await supabaseAdmin
      .from("packages").select("*").eq("id", data.package_id).maybeSingle();
    if (pErr || !pkg) throw new Error("Package not found");

    // Resolve user: explicit user_id wins, else lookup by email, else create
    let userId: string;
    if (data.user_id) {
      userId = data.user_id;
    } else {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = (list?.users ?? []).find(
        (u) => u.email?.toLowerCase() === data.email.toLowerCase(),
      );
      if (existing) {
        userId = existing.id;
      } else {
        const password = data.password && data.password.length >= 6
          ? data.password
          : Math.random().toString(36).slice(2) + "Aa1!";
        const { data: created, error: cuErr } = await supabaseAdmin.auth.admin.createUser({
          email: data.email,
          password,
          email_confirm: true,
          user_metadata: { full_name: data.full_name },
        });
        if (cuErr || !created.user) throw new Error(cuErr?.message ?? "Could not create account");
        userId = created.user.id;
      }
    }

    await supabaseAdmin.from("profiles").upsert(
      { id: userId, email: data.email, full_name: data.full_name, phone: data.phone ?? null } as any,
      { onConflict: "id" },
    );
    await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role: "brand_owner" }, { onConflict: "user_id,role" },
    );

    const expiresIso = data.auto_approve
      ? new Date(Date.now() + (pkg.duration_days ?? 30) * 86_400_000).toISOString()
      : null;

    // Upgrade existing brand or create new
    let brandId: string;
    if (data.brand_id) {
      const patch: Record<string, any> = {
        current_package_id: pkg.id,
        message_limit: pkg.message_limit,
        device_limit: pkg.device_limit,
        license_limit: pkg.license_count,
      };
      if (data.auto_approve) {
        patch.status = "active";
        patch.expires_at = expiresIso;
        patch.cancel_requested_at = null;
      }
      const { error: uErr } = await supabaseAdmin.from("brands").update(patch as any).eq("id", data.brand_id);
      if (uErr) throw new Error(uErr.message);
      brandId = data.brand_id;
    } else {
      const { data: brand, error: bErr } = await supabaseAdmin
        .from("brands")
        .insert({
          name: data.brand_name,
          status: (data.auto_approve ? "active" : "pending") as any,
          message_limit: pkg.message_limit,
          device_limit: pkg.device_limit,
          license_limit: pkg.license_count,
          created_by: userId,
          current_package_id: pkg.id,
          expires_at: expiresIso,
        } as any)
        .select("id")
        .single();
      if (bErr || !brand) throw new Error(bErr?.message ?? "Could not create brand");
      brandId = brand.id;
    }

    await supabaseAdmin.from("brand_members").upsert(
      { brand_id: brandId, user_id: userId, role: "brand_admin" },
      { onConflict: "brand_id,user_id" },
    );

    const price = Number(pkg.price);
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        package_id: pkg.id,
        user_id: userId,
        brand_id: brandId,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone ?? null,
        bkash_number: data.bkash_number ?? "",
        txid: data.txid ?? "",
        original_amount: price,
        discount_amount: 0,
        final_amount: price,
        status: data.auto_approve ? "approved" : "pending",
        approved_at: data.auto_approve ? new Date().toISOString() : null,
        approved_by: data.auto_approve ? context.userId : null,
        admin_notes: data.notes ?? "Created manually by staff",
      })
      .select("id")
      .single();
    if (oErr || !order) throw new Error(oErr?.message ?? "Could not create order");

    await supabaseAdmin.from("activity_log").insert({
      action: data.auto_approve ? "admin_create_subscription" : "admin_create_order",
      brand_id: brandId,
      user_id: context.userId,
      details: { order_id: order.id, package_id: pkg.id, upgraded: !!data.brand_id },
    });

    return { ok: true, order_id: order.id, brand_id: brandId };
  });

// Owner/staff: search existing customers for the manual order/subscription dialog
export const searchCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ q: z.string().trim().max(120).default("") }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: roleRow } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId)
      .in("role", ["owner", "support_agent", "sales_agent"]);
    if (!roleRow || roleRow.length === 0) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin.from("profiles").select("id, email, full_name, phone").limit(20);
    const q = data.q.replace(/[%,]/g, "");
    if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%,phone.ilike.%${q}%`);
    const { data: profs, error } = await query.order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    // attach brands per profile
    const ids = (profs ?? []).map((p: any) => p.id);
    let brandsByOwner: Record<string, any[]> = {};
    if (ids.length) {
      const { data: brands } = await supabaseAdmin
        .from("brands").select("id, name, status, created_by").in("created_by", ids);
      for (const b of brands ?? []) {
        (brandsByOwner[b.created_by!] ??= []).push({ id: b.id, name: b.name, status: b.status });
      }
    }
    return (profs ?? []).map((p: any) => ({ ...p, brands: brandsByOwner[p.id] ?? [] }));
  });

// Authenticated user: their brands eligible for upgrade/new order from the public order page
export const listMyBrandsForOrder = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("brands")
      .select("id, name, status, current_package_id, expires_at, packages:current_package_id(name, is_trial)")
      .eq("created_by", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((b: any) => ({
      id: b.id,
      name: b.name,
      status: b.status,
      expires_at: b.expires_at,
      package_name: b.packages?.name ?? null,
      is_trial: b.packages?.is_trial ?? false,
    }));
  });

// Authenticated user: place an order using their existing account (new brand OR upgrade existing brand)
export const createOrderForMe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        package_id: z.string().uuid(),
        brand_id: z.string().uuid().optional().nullable(),
        brand_name: z.string().trim().min(1).max(100).optional().nullable(),
        phone: z.string().trim().max(30).optional().nullable(),
        bkash_number: z.string().trim().max(30).optional().nullable(),
        txid: z.string().trim().max(64).optional().nullable(),
        coupon_code: z.string().trim().max(64).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: pkg, error: pErr } = await supabaseAdmin
      .from("packages").select("*").eq("id", data.package_id).eq("is_active", true).maybeSingle();
    if (pErr || !pkg) throw new Error("Package not found");

    // If brand_id provided, must be owned by this user
    let brandId: string | null = null;
    let brandName = data.brand_name ?? "";
    if (data.brand_id) {
      const { data: b } = await supabaseAdmin
        .from("brands").select("id, name, created_by").eq("id", data.brand_id).maybeSingle();
      if (!b || b.created_by !== context.userId) throw new Error("Brand not found");
      brandId = b.id;
      brandName = b.name;
    } else {
      if (!brandName || brandName.length < 1) throw new Error("Brand name required");
    }

    // Coupon
    let couponId: string | null = null;
    let discount = 0;
    if (data.coupon_code && data.coupon_code.trim()) {
      const { data: cres, error: cErr } = await supabaseAdmin.rpc("validate_coupon", {
        _code: data.coupon_code, _amount: Number(pkg.price),
      });
      if (cErr) throw new Error(cErr.message);
      const r = cres as any;
      if (!r?.valid) throw new Error(r?.error ?? "Invalid coupon");
      couponId = r.id;
      discount = Number(r.discount ?? 0);
    }
    const original = Number(pkg.price);
    const final = Math.max(original - discount, 0);
    if (final > 0) {
      if (!data.bkash_number || data.bkash_number.trim().length < 8) throw new Error("bKash number required");
      if (!data.txid || data.txid.trim().length < 4) throw new Error("Transaction ID required");
      const { data: dup } = await supabaseAdmin.from("orders").select("id").eq("txid", data.txid).maybeSingle();
      if (dup) throw new Error("This bKash TXID has already been submitted.");
    }

    // Get profile for fallback name/email
    const { data: profile } = await supabaseAdmin
      .from("profiles").select("email, full_name, phone").eq("id", context.userId).maybeSingle();

    // If new brand, create as pending
    if (!brandId) {
      const { data: nb, error: bErr } = await supabaseAdmin
        .from("brands")
        .insert({
          name: brandName,
          status: "pending" as any,
          message_limit: pkg.message_limit,
          device_limit: pkg.device_limit,
          license_limit: pkg.license_count,
          created_by: context.userId,
        } as any)
        .select("id").single();
      if (bErr || !nb) throw new Error(bErr?.message ?? "Could not create brand");
      brandId = nb.id;
      await supabaseAdmin.from("brand_members").upsert(
        { brand_id: brandId, user_id: context.userId, role: "brand_admin" },
        { onConflict: "brand_id,user_id" },
      );
    }

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        package_id: pkg.id,
        user_id: context.userId,
        brand_id: brandId,
        coupon_id: couponId,
        full_name: profile?.full_name ?? "",
        email: profile?.email ?? "",
        phone: data.phone ?? profile?.phone ?? null,
        bkash_number: data.bkash_number ?? "",
        txid: data.txid ?? "",
        original_amount: original,
        discount_amount: discount,
        final_amount: final,
        status: "pending",
      })
      .select("id").single();
    if (oErr || !order) throw new Error(oErr?.message ?? "Could not create order");

    return { ok: true, order_id: order.id, brand_id: brandId };
  });

