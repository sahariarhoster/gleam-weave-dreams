import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============ CONTACTS ============

const contactInput = z.object({
  brand_id: z.string().uuid(),
  name: z.string().max(200).nullable().optional(),
  phone: z.string().min(5).max(30),
  email: z.string().email().max(200).nullable().optional().or(z.literal("")),
  tags: z.array(z.string().max(50)).max(20).optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const listContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ brand_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("contacts")
      .select("id, brand_id, name, phone, email, tags, notes, created_at, brands(name)")
      .order("created_at", { ascending: false });
    if (data.brand_id) q = q.eq("brand_id", data.brand_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => contactInput.parse(d))
  .handler(async ({ data, context }) => {
    const payload = { ...data, email: data.email || null, created_by: context.userId };
    const { data: row, error } = await context.supabase
      .from("contacts").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => contactInput.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase
      .from("contacts")
      .update({ ...rest, email: rest.email || null })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("contacts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const importContacts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      brand_id: z.string().uuid(),
      rows: z.array(z.object({
        name: z.string().max(200).optional(),
        phone: z.string().min(5).max(30),
        email: z.string().max(200).optional(),
      })).min(1).max(5000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const payload = data.rows.map((r) => ({
      brand_id: data.brand_id,
      name: r.name || null,
      phone: r.phone.trim(),
      email: r.email?.trim() || null,
      created_by: context.userId,
    }));
    const { error, count } = await context.supabase
      .from("contacts")
      .upsert(payload, { onConflict: "brand_id,phone", count: "exact", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
    return { ok: true, inserted: count ?? 0, total: data.rows.length };
  });

// ============ GROUPS ============

const groupInput = z.object({
  brand_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
});

export const listGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ brand_id: z.string().uuid().optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("contact_groups")
      .select("id, brand_id, name, description, created_at, brands(name)")
      .order("created_at", { ascending: false });
    if (data.brand_id) q = q.eq("brand_id", data.brand_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (rows ?? []).map((g) => g.id);
    if (ids.length === 0) return [];
    const { data: members } = await context.supabase
      .from("contact_group_members")
      .select("group_id")
      .in("group_id", ids);
    const counts: Record<string, number> = {};
    (members ?? []).forEach((m) => {
      counts[m.group_id] = (counts[m.group_id] ?? 0) + 1;
    });
    return (rows ?? []).map((g) => ({ ...g, member_count: counts[g.id] ?? 0 }));
  });

export const createGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => groupInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("contact_groups").insert({ ...data, created_by: context.userId }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => groupInput.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { id, ...rest } = data;
    const { error } = await context.supabase.from("contact_groups").update(rest).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("contact_groups").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getGroupMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ group_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("contact_group_members")
      .select("contact_id, contacts(id, name, phone, email)")
      .eq("group_id", data.group_id);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => r.contacts).filter(Boolean);
  });

export const setGroupMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      group_id: z.string().uuid(),
      contact_ids: z.array(z.string().uuid()).max(10000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await context.supabase.from("contact_group_members").delete().eq("group_id", data.group_id);
    if (data.contact_ids.length > 0) {
      const rows = data.contact_ids.map((cid) => ({ group_id: data.group_id, contact_id: cid }));
      const { error } = await context.supabase.from("contact_group_members").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true, count: data.contact_ids.length };
  });
