import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Boxes, Check, Smartphone, KeyRound, Wallet, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { listCreditPackages, getWallet } from "@/lib/credits.functions";

export const Route = createFileRoute("/_authenticated/credit-plan")({
  head: () => ({ meta: [{ title: "Credit plan — WA Suite" }] }),
  component: CreditPlanPage,
});

function CreditPlanPage() {
  const fnPkgs = useServerFn(listCreditPackages);
  const fnWallet = useServerFn(getWallet);
  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [brandId, setBrandId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("brands").select("id, name").order("created_at", { ascending: false });
      const list = (data ?? []).map((b) => ({ id: b.id as string, name: b.name as string }));
      setBrands(list);
      if (list.length && !brandId) setBrandId(list[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pkgs = useQuery({ queryKey: ["credit-packages"], queryFn: () => fnPkgs() });
  const wallet = useQuery({
    queryKey: ["credit-wallet-plan", brandId],
    queryFn: () => fnWallet({ data: { brand_id: brandId } }),
    enabled: !!brandId,
  });

  const w = wallet.data?.wallet as any;
  const b = wallet.data?.brand as any;
  const currentPkgId = w?.package_id as string | undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader icon={Boxes} title="Credit plan" description="Pick the plan that matches your sending volume. You can change anytime — top-ups on a new plan switch your rate." />

      {brands.length > 1 && (
        <Select value={brandId} onValueChange={setBrandId}>
          <SelectTrigger className="w-full sm:w-72"><SelectValue /></SelectTrigger>
          <SelectContent>
            {brands.map((br) => <SelectItem key={br.id} value={br.id}>{br.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {b && (
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span>Balance: <strong>{(w?.balance ?? 0).toLocaleString()} credits</strong></span>
            </div>
            <div className="text-muted-foreground">
              Current plan: <strong className="text-foreground">{w?.credit_packages?.name ?? "None"}</strong>
            </div>
            {b.pricing_model === "legacy_subscription" && (
              <Badge variant="secondary">Legacy sub active — credits used after it expires</Badge>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {(pkgs.data ?? []).map((p: any) => {
          const isCurrent = currentPkgId === p.id;
          return (
            <Card key={p.id} className={isCurrent ? "border-primary ring-2 ring-primary/20" : ""}>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    <p className="text-xs text-muted-foreground uppercase">{p.code}</p>
                  </div>
                  {isCurrent && <Badge>Current</Badge>}
                </div>
                <div>
                  <div className="text-3xl font-bold">৳{p.tk_per_credit}<span className="text-sm font-normal text-muted-foreground"> / credit</span></div>
                  <div className="text-xs text-muted-foreground">Minimum top-up ৳{p.min_topup_tk}</div>
                </div>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> Pay per delivered SMS</li>
                  <li className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-emerald-600" /> {p.device_limit} device{p.device_limit > 1 ? "s" : ""} included</li>
                  <li className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-emerald-600" /> {p.wp_site_limit} WordPress site{p.wp_site_limit > 1 ? "s" : ""}</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> Credits valid 6 months from last top-up</li>
                </ul>
                <Button asChild className="w-full">
                  <Link to="/topup" search={{ brand: brandId, tab: "topup", pkg: p.id } as any}>
                    {isCurrent ? "Top up this plan" : "Switch & top up"} <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Need extra devices or plugin licenses? <Link to="/topup" search={{ brand: brandId, tab: "addon" } as any} className="text-primary hover:underline">Buy add-ons</Link>.
      </p>
    </div>
  );
}
