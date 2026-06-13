import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function hasAnyRole(supabase: any, userId: string, roles: string[]) {
  const { data } = await supabase
    .from("user_roles").select("role").eq("user_id", userId).in("role", roles);
  return (data ?? []).length > 0;
}

export const listSupportTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("support_tickets")
      .select("id, brand_id, created_by, subject, description, status, priority, assigned_to, created_at, updated_at, brands(name)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const userIds = Array.from(new Set(rows.map((r: any) => r.created_by).filter(Boolean)));
    let profileMap: Record<string, { email?: string; full_name?: string }> = {};
    if (userIds.length) {
      const { data: profs } = await context.supabase
        .from("profiles").select("id, email, full_name").in("id", userIds);
      (profs ?? []).forEach((p: any) => { profileMap[p.id] = { email: p.email, full_name: p.full_name }; });
    }
    return rows.map((r: any) => ({
      ...r,
      brand_name: r.brands?.name,
      requester_email: profileMap[r.created_by]?.email,
      requester_name: profileMap[r.created_by]?.full_name,
    }));
  });

export const createSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      brand_id: z.string().uuid().nullable().optional(),
      subject: z.string().trim().min(1).max(200),
      description: z.string().trim().max(5000).optional().nullable(),
      priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("support_tickets")
      .insert({
        brand_id: data.brand_id ?? null,
        created_by: context.userId,
        subject: data.subject,
        description: data.description ?? null,
        priority: data.priority ?? "normal",
      })
      .select("id, subject, brands(name)")
      .single();
    if (error) throw new Error(error.message);

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profile } = await supabaseAdmin
        .from("profiles").select("email, full_name").eq("id", context.userId).maybeSingle();
      const who = profile?.full_name || profile?.email || context.userId;
      const brandName = (row as any)?.brands?.name ?? "—";
      const msg =
        `🎫 New support ticket\n\n` +
        `Brand: ${brandName}\n` +
        `From: ${who}\n` +
        `Subject: ${data.subject}\n` +
        (data.description ? `\n${data.description}\n` : "");
      const { notifyAdmins } = await import("@/lib/notify.server");
      await notifyAdmins(msg);
    } catch {}

    return { ok: true, id: (row as any)?.id };
  });

export const updateSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
      priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, any> = {};
    if (data.status) patch.status = data.status;
    if (data.priority) patch.priority = data.priority;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await context.supabase
      .from("support_tickets").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("support_tickets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listTicketMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ ticket_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("support_ticket_messages")
      .select("id, ticket_id, sender_id, body, is_internal, created_at")
      .eq("ticket_id", data.ticket_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((rows ?? []).map((r: any) => r.sender_id)));
    let profileMap: Record<string, { email?: string; full_name?: string }> = {};
    if (ids.length) {
      const { data: profs } = await context.supabase
        .from("profiles").select("id, email, full_name").in("id", ids);
      (profs ?? []).forEach((p: any) => { profileMap[p.id] = { email: p.email, full_name: p.full_name }; });
    }
    return (rows ?? []).map((r: any) => ({
      ...r,
      sender_name: profileMap[r.sender_id]?.full_name ?? profileMap[r.sender_id]?.email ?? "Unknown",
    }));
  });

export const postTicketMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      ticket_id: z.string().uuid(),
      body: z.string().trim().min(1).max(5000),
      is_internal: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    let isInternal = data.is_internal ?? false;
    if (isInternal) {
      const isStaff = await hasAnyRole(context.supabase, context.userId, ["owner", "support_agent"]);
      if (!isStaff) isInternal = false;
    }
    const { error } = await context.supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: data.ticket_id,
        sender_id: context.userId,
        body: data.body,
        is_internal: isInternal,
      });
    if (error) throw new Error(error.message);
    // bump ticket updated_at
    await context.supabase.from("support_tickets").update({ status: undefined }).eq("id", data.ticket_id);
    return { ok: true };
  });
