import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getPluginRelease = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isOwner } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "owner").maybeSingle();
    if (!isOwner) throw new Error("Owner only");
    const { data, error } = await context.supabase
      .from("system_settings")
      .select("plugin_version, plugin_download_url, plugin_changelog, plugin_tested_wp, plugin_requires_wp, plugin_requires_php")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error("Failed to load plugin release");
    return data ?? null;
  });

export const setPluginRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      plugin_version: z.string().min(1).max(20).regex(/^[0-9]+\.[0-9]+\.[0-9]+$/, "Use x.y.z"),
      plugin_download_url: z.string().url().max(500).optional().nullable(),
      plugin_changelog: z.string().max(10000).optional().nullable(),
      plugin_tested_wp: z.string().max(20).optional().nullable(),
      plugin_requires_wp: z.string().max(20).optional().nullable(),
      plugin_requires_php: z.string().max(20).optional().nullable(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "owner").maybeSingle();
    if (!isOwner) throw new Error("Owner only");
    const { error } = await context.supabase
      .from("system_settings")
      .upsert({ id: true, ...data, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
