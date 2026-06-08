import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const filters = z.object({
  brand_id: z.string().uuid().nullable().optional(),
  campaign_id: z.string().uuid().nullable().optional(),
  status: z.enum(["pending", "sent", "failed", "skipped"]).nullable().optional(),
  search: z.string().max(120).nullable().optional(),
  limit: z.number().int().min(1).max(500).default(200),
});

export const listMessageLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => filters.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("campaign_messages")
      .select("id, campaign_id, phone, rendered_message, status, error_message, sent_at, created_at, campaigns(name, brand_id, brands(name))")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.campaign_id) q = q.eq("campaign_id", data.campaign_id);
    if (data.search) q = q.ilike("phone", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    let result = rows ?? [];
    if (data.brand_id) {
      result = result.filter((r: any) => r.campaigns?.brand_id === data.brand_id);
    }
    return result;
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
    let q = context.supabase
      .from("activity_log")
      .select("id, action, details, brand_id, user_id, created_at, brands(name), profiles(email, full_name)")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.brand_id) q = q.eq("brand_id", data.brand_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const listBlocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ brand_id: z.string().uuid().nullable().optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("blocked_numbers")
      .select("id, phone, reason, brand_id, created_at, brands(name)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.brand_id) q = q.eq("brand_id", data.brand_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
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
