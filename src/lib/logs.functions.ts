import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function attachBrands(supabase: any, rows: any[], key = "brand_id") {
  const ids = Array.from(new Set(rows.map((r) => r[key]).filter(Boolean)));
  if (ids.length === 0) return rows;
  const { data } = await supabase.from("brands").select("id, name").in("id", ids);
  const map: Record<string, string> = {};
  (data ?? []).forEach((b: any) => (map[b.id] = b.name));
  return rows.map((r) => ({ ...r, brand_name: r[key] ? map[r[key]] ?? null : null }));
}

const logFilters = z.object({
  brand_id: z.string().uuid().nullable().optional(),
  campaign_id: z.string().uuid().nullable().optional(),
  status: z.enum(["pending", "sent", "failed", "skipped"]).nullable().optional(),
  search: z.string().max(120).nullable().optional(),
  limit: z.number().int().min(1).max(500).default(200),
});

export const listMessageLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => logFilters.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("campaign_messages")
      .select("id, campaign_id, phone, rendered_message, status, error_message, sent_at, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.campaign_id) q = q.eq("campaign_id", data.campaign_id);
    if (data.search) q = q.ilike("phone", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const msgs = rows ?? [];
    const campIds = Array.from(new Set(msgs.map((m: any) => m.campaign_id).filter(Boolean)));
    let camps: any[] = [];
    if (campIds.length) {
      const { data: c } = await context.supabase
        .from("campaigns")
        .select("id, name, brand_id")
        .in("id", campIds);
      camps = c ?? [];
    }
    const campMap: Record<string, any> = {};
    camps.forEach((c) => (campMap[c.id] = c));
    let result = msgs.map((m: any) => {
      const c = campMap[m.campaign_id];
      return { ...m, campaign_name: c?.name ?? null, brand_id: c?.brand_id ?? null };
    });
    if (data.brand_id) result = result.filter((r: any) => r.brand_id === data.brand_id);
    return attachBrands(context.supabase, result);
  });

export const listActivityLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      brand_id: z.string().uuid().nullable().optional(),
      limit: z.number().int().min(1).max(500).default(200),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    // Scope: owners see all; others only see logs for brands they belong to.
    const { data: ownerRow } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .in("role", ["owner", "support_agent"]);
    const isOwner = !!(ownerRow && ownerRow.length > 0);
    let memberBrandIds: string[] = [];
    if (!isOwner) {
      const { data: mems } = await context.supabase
        .from("brand_members")
        .select("brand_id")
        .eq("user_id", context.userId);
      memberBrandIds = (mems ?? []).map((m: any) => m.brand_id).filter(Boolean);
      if (memberBrandIds.length === 0) return [];
    }
    let q = context.supabase
      .from("activity_log")
      .select("id, action, details, brand_id, user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.brand_id) {
      if (!isOwner && !memberBrandIds.includes(data.brand_id)) return [];
      q = q.eq("brand_id", data.brand_id);
    } else if (!isOwner) {
      q = q.in("brand_id", memberBrandIds);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error("Failed to load activity log");

    const logs = rows ?? [];
    const userIds = Array.from(new Set(logs.map((l: any) => l.user_id).filter(Boolean)));
    let profiles: any[] = [];
    if (userIds.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: p } = await supabaseAdmin
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      profiles = p ?? [];
    }
    const pMap: Record<string, any> = {};
    profiles.forEach((p) => (pMap[p.id] = p));
    const enriched = logs.map((l: any) => ({
      ...l,
      user_email: pMap[l.user_id]?.email ?? null,
      user_name: pMap[l.user_id]?.full_name ?? null,
    }));
    return attachBrands(context.supabase, enriched);
  });

export const listBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ brand_id: z.string().uuid().nullable().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("blocked_numbers")
      .select("id, phone, reason, brand_id, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.brand_id) q = q.eq("brand_id", data.brand_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return attachBrands(context.supabase, rows ?? []);
  });

export const addBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      brand_id: z.string().uuid(),
      phones: z.string().min(1).max(20000),
      reason: z.string().max(200).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const phones = Array.from(
      new Set(
        data.phones
          .split(/[\n,;\s]+/)
          .map((p) => p.trim())
          .filter(Boolean),
      ),
    );
    if (phones.length === 0) return { inserted: 0 };
    const rows = phones.map((phone) => ({
      brand_id: data.brand_id,
      phone,
      reason: data.reason ?? null,
      created_by: context.userId,
    }));
    const { error } = await context.supabase.from("blocked_numbers").upsert(rows, {
      onConflict: "brand_id,phone",
      ignoreDuplicates: true,
    });
    if (error) throw new Error(error.message);
    return { inserted: rows.length };
  });

export const removeBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("blocked_numbers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
