import { createFileRoute, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Wallet, Check, Tag, Plus, Smartphone, KeyRound, Boxes } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { listCreditPackages, createCreditTopupOrder, createAddonOrder, getWallet } from "@/lib/credits.functions";

const BKASH_NUMBER = "01407168338";

const ADDON_PRICES = { device: 400, wp_license: 400, combo: 700 } as const;
const ADDON_LABELS = {
  device: "Extra device",
  wp_license: "Extra WordPress license",
  combo: "Device + license combo",
} as const;

export const Route = createFileRoute("/_authenticated/topup")({
  validateSearch: (s: Record<string, unknown>): { brand?: string; tab?: "topup" | "addon"; pkg?: string } => ({
    brand: typeof s.brand === "string" ? s.brand : undefined,
    tab: s.tab === "addon" ? "addon" : "topup",
    pkg: typeof s.pkg === "string" ? s.pkg : undefined,
  }),
  head: () => ({ meta: [{ title: "Top up credits — WA Suite" }] }),
  component: TopupPage,
});

function TopupPage() {
  const search = useSearch({ from: "/_authenticated/topup" });
  const navigate = useNavigate();
  const fnPackages = useServerFn(listCreditPackages);
  const fnTopup = useServerFn(createCreditTopupOrder);
  const fnAddon = useServerFn(createAddonOrder);
  const fnWallet = useServerFn(getWallet);

  const [brands, setBrands] = useState<Array<{ id: string; name: string }>>([]);
  const [brandId, setBrandId] = useState<string>(search.brand ?? "");
  const [tab, setTab] = useState<"topup" | "addon">(search.tab ?? "topup");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("brands").select("id, name").order("created_at", { ascending: false });
      const list = (data ?? []).map((b) => ({ id: b.id as string, name: b.name as string }));
      setBrands(list);
      if (!brandId && list.length) setBrandId(list[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pkgs = useQuery({ queryKey: ["credit-packages"], queryFn: () => fnPackages() });
  const wallet = useQuery({
    queryKey: ["wallet-topup", brandId],
    queryFn: () => fnWallet({ data: { brand_id: brandId } }),
    enabled: !!brandId,
  });

  // Topup state
  const [packageId, setPackageId] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const selectedPkg = useMemo(() => (pkgs.data ?? []).find((p: any) => p.id === packageId), [pkgs.data, packageId]);

  useEffect(() => {
    if (!selectedPkg) return;
    setAmount(Number(selectedPkg.min_topup_tk));
  }, [packageId]); // eslint-disable-line

  const credits = selectedPkg ? Math.floor(amount / Number(selectedPkg.tk_per_credit)) : 0;

  // Addon state
  const [addonKind, setAddonKind] = useState<"device" | "wp_license" | "combo">("device");
  const addonTotal = ADDON_PRICES[addonKind];

  // Payment state (shared)
  const [bkashNumber, setBkashNumber] = useState("");
  const [txid, setTxid] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submitTopup(e: React.FormEvent) {
    e.preventDefault();
    if (!brandId) return toast.error("Choose a brand");
    if (!packageId) return toast.error("Choose a pack");
    if (selectedPkg && amount < Number(selectedPkg.min_topup_tk)) {
      return toast.error(`Minimum top-up for ${selectedPkg.name} is ৳${selectedPkg.min_topup_tk}`);
    }
    setSubmitting(true);
    try {
      await fnTopup({
        data: { brand_id: brandId, package_id: packageId, amount_tk: amount, bkash_number: bkashNumber, txid },
      });
      setDone(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitAddon(e: React.FormEvent) {
    e.preventDefault();
    if (!brandId) return toast.error("Choose a brand");
    setSubmitting(true);
    try {
      await fnAddon({
        data: { brand_id: brandId, addon_kind: addonKind, quantity: 1, bkash_number: bkashNumber, txid },
      });
      setDone(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md py-12">
        <Card>
          <CardContent className="pt-6 space-y-4 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 grid place-content-center">
              <Check className="h-7 w-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold">Order placed!</h2>
            <p className="text-sm text-muted-foreground">
              We'll verify your bKash payment and credit your account within a few hours.
            </p>
            <Button onClick={() => navigate({ to: "/credits" })} className="w-full">
              Back to credits
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const w = wallet.data?.wallet as any;
  const b = wallet.data?.brand as any;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <PageHeader icon={Wallet} title="Top up & add-ons" description="Buy SMS credits or extra devices / plugin licenses." />

      {brands.length > 1 && (
        <Select value={brandId} onValueChange={setBrandId}>
          <SelectTrigger className="w-full sm:w-72"><SelectValue placeholder="Select brand" /></SelectTrigger>
          <SelectContent>
            {brands.map((br) => <SelectItem key={br.id} value={br.id}>{br.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

      {b && (
        <div className="text-sm text-muted-foreground">
          Brand: <strong className="text-foreground">{b.name}</strong> · Current balance:{" "}
          <strong className="text-foreground">{w?.balance ?? 0} credits</strong>
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="topup"><Plus className="h-3.5 w-3.5 mr-1" /> Top up credits</TabsTrigger>
          <TabsTrigger value="addon"><Boxes className="h-3.5 w-3.5 mr-1" /> Add-ons</TabsTrigger>
        </TabsList>

        <TabsContent value="topup" className="mt-4">
          <form onSubmit={submitTopup} className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              {pkgs.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {(pkgs.data ?? []).map((p: any) => {
                    const active = packageId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPackageId(p.id)}
                        className={`text-left rounded-xl border bg-card p-4 transition shadow-sm hover:shadow-md ${
                          active ? "border-primary ring-2 ring-primary/20" : "border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{p.name}</h3>
                          <Badge variant="secondary">৳{p.tk_per_credit}/credit</Badge>
                        </div>
                        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                          <li className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> {p.device_limit} device{p.device_limit > 1 ? "s" : ""}</li>
                          <li className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> {p.wp_site_limit} WordPress site{p.wp_site_limit > 1 ? "s" : ""}</li>
                          <li>Min top-up: ৳{p.min_topup_tk}</li>
                        </ul>
                      </button>
                    );
                  })}
                </div>
              )}

              {selectedPkg && (
                <Card>
                  <CardContent className="pt-6 space-y-3">
                    <Label>Top-up amount (BDT)</Label>
                    <Input
                      type="number"
                      min={Number(selectedPkg.min_topup_tk)}
                      step={50}
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Minimum ৳{selectedPkg.min_topup_tk} · You'll get <strong>{credits.toLocaleString()} credits</strong>
                    </p>

                    <div className="border-t pt-4">
                      <div className="rounded-lg bg-pink-50 border border-pink-200 p-3 text-sm">
                        <p className="font-medium text-pink-900">bKash payment</p>
                        <p className="text-2xl font-bold text-pink-700 mt-1">{BKASH_NUMBER}</p>
                        <p className="text-xs text-pink-900/70 mt-1">Pay <strong>৳{amount}</strong>, then enter the TXID below.</p>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-3 mt-3">
                        <div>
                          <Label>Your bKash number</Label>
                          <Input required value={bkashNumber} onChange={(e) => setBkashNumber(e.target.value)} placeholder="01XXXXXXXXX" />
                        </div>
                        <div>
                          <Label>Transaction ID (TrxID)</Label>
                          <Input required value={txid} onChange={(e) => setTxid(e.target.value)} placeholder="e.g. AB12CD34EF" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card className="h-fit">
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-semibold">Summary</h3>
                <Row label="Pack" value={selectedPkg?.name ?? "—"} />
                <Row label="Rate" value={selectedPkg ? `৳${selectedPkg.tk_per_credit}/credit` : "—"} />
                <Row label="Amount" value={`৳${amount || 0}`} />
                <Row label="Credits" value={credits.toLocaleString()} bold />
                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>৳{amount || 0}</span>
                </div>
                <Button type="submit" className="w-full" disabled={submitting || !selectedPkg}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Place top-up order"}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Credits are added after we verify your bKash payment.
                </p>
              </CardContent>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="addon" className="mt-4">
          <form onSubmit={submitAddon} className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                {(["device", "wp_license", "combo"] as const).map((k) => {
                  const active = addonKind === k;
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setAddonKind(k)}
                      className={`text-left rounded-xl border bg-card p-4 transition shadow-sm hover:shadow-md ${
                        active ? "border-primary ring-2 ring-primary/20" : "border-border"
                      }`}
                    >
                      <h3 className="font-semibold">{ADDON_LABELS[k]}</h3>
                      <div className="mt-2 text-2xl font-bold">৳{ADDON_PRICES[k]}</div>
                      <p className="text-xs text-muted-foreground">
                        {k === "combo" ? "+1 device & +1 WP license" : k === "device" ? "+1 device slot" : "+1 plugin license"}
                      </p>
                    </button>
                  );
                })}
              </div>

              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="rounded-lg bg-pink-50 border border-pink-200 p-3 text-sm">
                    <p className="font-medium text-pink-900">bKash payment</p>
                    <p className="text-2xl font-bold text-pink-700 mt-1">{BKASH_NUMBER}</p>
                    <p className="text-xs text-pink-900/70 mt-1">Pay <strong>৳{addonTotal}</strong>, then enter the TXID below.</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Your bKash number</Label>
                      <Input required value={bkashNumber} onChange={(e) => setBkashNumber(e.target.value)} placeholder="01XXXXXXXXX" />
                    </div>
                    <div>
                      <Label>Transaction ID (TrxID)</Label>
                      <Input required value={txid} onChange={(e) => setTxid(e.target.value)} placeholder="e.g. AB12CD34EF" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="h-fit">
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-semibold">Summary</h3>
                <Row label="Add-on" value={ADDON_LABELS[addonKind]} />
                <Row label="Quantity" value="1" />
                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>৳{addonTotal}</span>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Place add-on order"}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Limits are increased after we verify your bKash payment.
                </p>
              </CardContent>
            </Card>
          </form>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Need to view your transactions? <Link to="/credits" className="text-primary hover:underline">Go to Credits</Link>
      </p>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
