import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertOwner(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: owners only");
}

export const getWhmcsSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("system_settings")
      .select("whmcs_api_token")
      .limit(1)
      .maybeSingle();
    return { token: (data?.whmcs_api_token ?? "") as string };
  });

function randomToken(len = 48) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const regenerateWhmcsToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = randomToken(32);
    // single-row table keyed on id boolean
    const { data: existing } = await supabaseAdmin
      .from("system_settings").select("id").limit(1).maybeSingle();
    if (existing) {
      await supabaseAdmin.from("system_settings")
        .update({ whmcs_api_token: token }).eq("id", existing.id);
    } else {
      await supabaseAdmin.from("system_settings").insert({ whmcs_api_token: token });
    }
    return { token };
  });
