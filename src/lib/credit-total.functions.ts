import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyCreditTotal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: brands } = await context.supabase.from("brands").select("id, name");
    const ids = (brands ?? []).map((b: any) => b.id);
    if (!ids.length) return { total: 0, brands: [] as Array<{ id: string; name: string; balance: number }> };
    const { data: wallets } = await context.supabase
      .from("credit_wallets")
      .select("brand_id, balance")
      .in("brand_id", ids);
    const wmap = new Map((wallets ?? []).map((w: any) => [w.brand_id, w.balance]));
    const rows = (brands ?? []).map((b: any) => ({
      id: b.id as string,
      name: b.name as string,
      balance: (wmap.get(b.id) as number) ?? 0,
    }));
    const total = rows.reduce((s, r) => s + (r.balance || 0), 0);
    return { total, brands: rows };
  });
