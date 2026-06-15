import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Wallet, Plus, AlertTriangle, Clock, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { getWallet, listCreditTransactions } from "@/lib/credits.functions";

export const Route = createFileRoute("/_authenticated/credits")({
  head: () => ({ meta: [{ title: "Credits — WA Suite" }] }),
  component: CreditsPage,
});

function CreditsPage() {
  const fnWallet = useServerFn(getWallet);
  const fnTxns = useServerFn(listCreditTransactions);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [brandId, setBrandId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("brands").select("id, name").order("created_at", { ascending: false });
      const list = (data ?? []).map((b) => ({ id: b.id as string, name: b.name as string }));
      setBrands(list);
      if (list.length && !brandId) setBrandId(list[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wallet = useQuery({
    queryKey: ["credit-wallet", brandId],
    queryFn: () => fnWallet({ data: { brand_id: brandId } }),
    enabled: !!brandId,
  });
  const txns = useQuery({
    queryKey: ["credit-txns", brandId],
    queryFn: () => fnTxns({ data: { brand_id: brandId, limit: 50 } }),
    enabled: !!brandId,
  });

  const w = wallet.data?.wallet as any;
  const b = wallet.data?.brand as any;
  const pricingModel = b?.pricing_model ?? "trial";
  const balance = w?.balance ?? 0;
  const expiresAt = w?.expires_at ? new Date(w.expires_at) : null;
  const pkg = w?.credit_packages;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader icon={Wallet} title="Credits" description="Your SMS credit balance, top-ups, and transaction history." />

      {brands.length > 1 && (
        <Select value={brandId} onValueChange={setBrandId}>
          <SelectTrigger className="w-full sm:w-72"><SelectValue /></SelectTrigger>
          <SelectContent>
            {brands.map((br) => <SelectItem key={br.id} value={br.id}>{br.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {pricingModel === "legacy_subscription" && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4 text-sm">
            <strong>Legacy subscription:</strong> this brand is on the older subscription plan and does not use credits. Sending continues based on your package limits.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6 grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs uppercase text-muted-foreground">Balance</div>
            <div className="text-3xl font-bold mt-1">{balance.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">credits</div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground">Plan</div>
            <div className="font-semibold mt-1">{pkg?.name ?? "—"}</div>
            <div className="text-xs text-muted-foreground">
              {pkg ? `৳${pkg.tk_per_credit}/credit · ${pkg.device_limit} device · ${pkg.wp_site_limit} WP sites` : "No active pack"}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Expires</div>
            <div className="font-semibold mt-1">{expiresAt ? expiresAt.toLocaleDateString() : "—"}</div>
            <div className="text-xs text-muted-foreground">Top-up extends to 6 months</div>
          </div>
        </CardContent>
      </Card>

      {balance > 0 && balance < 100 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>Low balance — top up soon to avoid interruption.</span>
          </CardContent>
        </Card>
      )}
      {balance === 0 && pricingModel === "credits" && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-3 flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span><strong>Out of credits.</strong> All campaigns are paused. Top up to resume sending.</span>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button asChild>
          <Link to="/order" search={{ topup: brandId } as any}><Plus className="h-4 w-4 mr-1" /> Top up credits</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/order" search={{ addon: brandId } as any}>Buy add-on</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="px-4 py-3 border-b font-semibold text-sm">Recent transactions</div>
          {txns.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Loading…</div>
          ) : (txns.data ?? []).length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No transactions yet.</div>
          ) : (
            <ul className="divide-y">
              {(txns.data ?? []).map((t: any) => {
                const isIn = t.credits > 0;
                return (
                  <li key={t.id} className="px-4 py-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {isIn ? <ArrowUpCircle className="h-4 w-4 text-emerald-600" /> : <ArrowDownCircle className="h-4 w-4 text-red-500" />}
                      <div>
                        <div className="font-medium">{t.type}{t.note ? ` — ${t.note}` : ""}</div>
                        <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${isIn ? "text-emerald-600" : "text-red-600"}`}>
                        {isIn ? "+" : ""}{t.credits}
                      </div>
                      {t.tk_amount ? <div className="text-xs text-muted-foreground">৳{t.tk_amount}</div> : null}
                      {t.balance_after != null && <Badge variant="secondary" className="text-[10px]">bal {t.balance_after}</Badge>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
