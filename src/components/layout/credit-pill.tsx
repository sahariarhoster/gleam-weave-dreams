import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyCreditTotal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // brands the user can see via RLS
    const { data: brands } = await context.supabase.from("brands").select("id, name, pricing_model, expires_at");
    const ids = (brands ?? []).map((b: any) => b.id);
    if (!ids.length) return { total: 0, brands: [] as Array<{ id: string; name: string; balance: number }> };
    const { data: wallets } = await context.supabase
      .from("credit_wallets")
      .select("brand_id, balance, expires_at")
      .in("brand_id", ids);
    const wmap = new Map((wallets ?? []).map((w: any) => [w.brand_id, w]));
    const rows = (brands ?? []).map((b: any) => ({
      id: b.id,
      name: b.name,
      balance: (wmap.get(b.id) as any)?.balance ?? 0,
    }));
    const total = rows.reduce((s, r) => s + (r.balance || 0), 0);
    return { total, brands: rows };
  });

export function CreditPill() {
  const fn = useServerFn(getMyCreditTotal);
  const q = useQuery({ queryKey: ["my-credit-total"], queryFn: () => fn(), staleTime: 30_000, refetchInterval: 60_000 });
  const total = q.data?.total ?? 0;
  const tone =
    total === 0 ? "bg-red-50 text-red-700 border-red-200"
    : total < 100 ? "bg-amber-50 text-amber-800 border-amber-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";
  return (
    <Link
      to="/credits"
      className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium hover:opacity-90 ${tone}`}
      title="Available credits"
    >
      <Wallet className="h-3.5 w-3.5" />
      <span>{total.toLocaleString()} credits</span>
    </Link>
  );
}
