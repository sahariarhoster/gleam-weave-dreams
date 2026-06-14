import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertOwner(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: owner only");
}

const tutorialInput = z.object({
  id: z.string().uuid().optional(),
  video_id: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  category: z.string().trim().min(1).max(50),
  sort_order: z.number().int().min(0).max(10000),
});

export const upsertTutorial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => tutorialInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { id, ...payload } = data;
    if (id) {
      const { error } = await context.supabase.from("tutorials").update(payload).eq("id", id);
      if (error) {
        console.error("[tutorials.update]", error.message);
        throw new Error("Failed to update tutorial");
      }
    } else {
      const { error } = await context.supabase.from("tutorials").insert(payload);
      if (error) {
        console.error("[tutorials.insert]", error.message);
        throw new Error("Failed to add tutorial");
      }
    }
    return { ok: true };
  });

export const deleteTutorial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { error } = await context.supabase.from("tutorials").delete().eq("id", data.id);
    if (error) {
      console.error("[tutorials.delete]", error.message);
      throw new Error("Failed to delete tutorial");
    }
    return { ok: true };
  });
