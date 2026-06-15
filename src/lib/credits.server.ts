// Server-only helpers for the credit system.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendWhatsApp, fillTemplate } from "@/lib/notify.server";

const DEFAULT_LOW_TPL =
  "⚠️ Hi {name}, your WA Suite credit balance for *{brand}* is low: *{balance} credits* left. Please top up soon to avoid interruption.";
const DEFAULT_ZERO_TPL =
  "🛑 Hi {name}, your WA Suite credit balance for *{brand}* has reached *0*. All campaigns are now paused. Please top up to resume sending.";

/**
 * Fire WhatsApp notice when a brand's credit balance hits the configured
 * low-balance threshold or reaches zero. Fires once at exact crossing to
 * avoid spamming on every message. Best-effort — never throws.
 */
export async function notifyLowBalanceMaybe(brandId: string, newBalance: number): Promise<void> {
  try {
    if (newBalance < 0) return;
    const { data: settings } = await supabaseAdmin
      .from("system_settings")
      .select("low_balance_threshold, low_balance_wa_template, zero_balance_wa_template")
      .limit(1)
      .maybeSingle();
    const threshold = (settings as any)?.low_balance_threshold ?? 100;
    const isZero = newBalance === 0;
    const isLow = !isZero && threshold > 0 && newBalance === threshold;
    if (!isZero && !isLow) return;

    const { data: brand } = await supabaseAdmin
      .from("brands")
      .select("name, created_by")
      .eq("id", brandId)
      .maybeSingle();
    if (!brand?.created_by) return;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, phone")
      .eq("id", brand.created_by)
      .maybeSingle();
    if (!profile?.phone) return;

    const tpl =
      (isZero
        ? ((settings as any)?.zero_balance_wa_template as string | null)
        : ((settings as any)?.low_balance_wa_template as string | null)) ||
      (isZero ? DEFAULT_ZERO_TPL : DEFAULT_LOW_TPL);

    const msg = fillTemplate(tpl, {
      name: profile.full_name ?? "",
      brand: brand.name ?? "",
      balance: newBalance,
    });
    // Fire-and-forget — sendWhatsApp has built-in 10–23s jitter we don't want to await on hot paths.
    void sendWhatsApp(profile.phone, msg);
  } catch {
    /* swallow */
  }
}
