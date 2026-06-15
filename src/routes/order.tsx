import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Check, MessageCircle, Smartphone, Infinity as InfinityIcon, KeyRound, Calendar, Tag, LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listActivePackages, listActiveCreditPackages, validateCoupon, createOrder, createOrderForMe, listMyBrandsForOrder } from "@/lib/orders.functions";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const BKASH_NUMBER = "01407168338";

export const Route = createFileRoute("/order")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { upgrade?: string } => ({
    upgrade: typeof s.upgrade === "string" ? s.upgrade : undefined,
  }),
  head: () => ({ meta: [{ title: "Create your account — WA Suite" }] }),
  component: OrderPage,
});

function OrderPage() {
  const fnList = useServerFn(listActivePackages);
  const fnCredits = useServerFn(listActiveCreditPackages);
  const fnCoupon = useServerFn(validateCoupon);
  const fnCreate = useServerFn(createOrder);
  const fnCreateMe = useServerFn(createOrderForMe);
  const fnMyBrands = useServerFn(listMyBrandsForOrder);
  const navigate = useNavigate();
  const search = useSearch({ from: "/order" });
  const { user, loading } = useAuth();
  const loggedIn = !!user;

  const packages = useQuery({ queryKey: ["public-packages"], queryFn: () => fnList() });
  const creditPackages = useQuery({ queryKey: ["public-credit-packages"], queryFn: () => fnCredits() });
  const myBrands = useQuery({
    queryKey: ["my-brands-for-order", user?.id ?? "anon"],
    queryFn: () => fnMyBrands(),
    enabled: loggedIn,
  });

  // selection: { kind: "sub" | "credit", id: string }
  const [selected, setSelected] = useState<{ kind: "sub" | "credit"; id: string } | null>(null);

  const [brandChoice, setBrandChoice] = useState<string>("__new__"); // brand_id or __new__
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    brand_name: "",
    business_doc_type: "nid" as "nid" | "trade_license",
    business_doc_number: "",
    bkash_number: "",
    txid: "",
    coupon_code: "",
  });
  const [discount, setDiscount] = useState<{ valid: boolean; discount?: number; final?: number; error?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [couponChecking, setCouponChecking] = useState(false);
  const [done, setDone] = useState(false);

  // Prefill from profile if logged in
  useEffect(() => {
    if (!loggedIn || !user) return;
    (async () => {
      const { data: p } = await supabase
        .from("profiles").select("email, full_name, phone").eq("id", user.id).maybeSingle();
      setForm((f) => ({
        ...f,
        email: p?.email ?? user.email ?? "",
        full_name: p?.full_name ?? "",
        phone: p?.phone ?? f.phone,
      }));
    })();
  }, [loggedIn, user]);

  // Honor ?upgrade=<brand_id>
  useEffect(() => {
    if (search.upgrade && myBrands.data?.some((b) => b.id === search.upgrade)) {
      setBrandChoice(search.upgrade);
    }
  }, [search.upgrade, myBrands.data]);

  const pkg = (packages.data ?? []).find((p: any) => p.id === selected);
  const original = pkg ? Number(pkg.price) : 0;
  const final = discount?.valid ? (discount.final ?? original) : original;

  async function checkCoupon() {
    if (!pkg || !form.coupon_code.trim()) return;
    setCouponChecking(true);
    try {
      const res = await fnCoupon({ data: { code: form.coupon_code.trim(), amount: original } });
      setDiscount(res);
      if (res.valid) toast.success(`Coupon applied — saved ৳${res.discount}`);
      else toast.error(res.error ?? "Invalid coupon");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCouponChecking(false);
    }
  }

  const requirePayment = final > 0;
  const upgrading = loggedIn && brandChoice !== "__new__";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return toast.error("Pick a package");
    setSubmitting(true);
    try {
      if (loggedIn) {
        await fnCreateMe({
          data: {
            package_id: selected,
            brand_id: upgrading ? brandChoice : null,
            brand_name: upgrading ? null : form.brand_name,
            phone: form.phone || null,
            bkash_number: requirePayment ? form.bkash_number : null,
            txid: requirePayment ? form.txid : null,
            coupon_code: form.coupon_code || null,
          },
        });
      } else {
        await fnCreate({
          data: {
            package_id: selected,
            full_name: form.full_name,
            email: form.email,
            password: form.password,
            phone: form.phone,
            brand_name: form.brand_name,
            business_doc_type: form.business_doc_type,
            business_doc_number: form.business_doc_number,
            bkash_number: requirePayment ? form.bkash_number : null,
            txid: requirePayment ? form.txid : null,
            coupon_code: form.coupon_code || null,
          },
        });
      }
      setDone(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen grid place-content-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 space-y-4 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 grid place-content-center">
              <Check className="h-7 w-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold">{upgrading ? "Upgrade requested!" : "Order placed!"}</h2>
            <p className="text-sm text-muted-foreground">
              {requirePayment
                ? "We'll verify your bKash payment and activate your subscription within a few hours."
                : "We'll activate your subscription shortly."}
            </p>
            <Button onClick={() => navigate({ to: loggedIn ? "/subscriptions" : "/auth" })} className="w-full">
              {loggedIn ? "Back to subscriptions" : "Go to sign in"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-content-center">
              <MessageCircle className="h-4 w-4" />
            </div>
            <span className="font-semibold">WA Suite</span>
          </div>
          {loggedIn ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground hidden sm:inline">Signed in as {user.email}</span>
              <Link to="/subscriptions" className="text-muted-foreground hover:text-foreground">My subscriptions</Link>
              <Button size="sm" variant="ghost" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}>
                <LogOut className="h-3.5 w-3.5 mr-1" /> Sign out
              </Button>
            </div>
          ) : (
            <Link to="/auth" search={{ redirect: "/order" }} className="text-sm text-muted-foreground hover:text-foreground">
              Already have an account? Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {upgrading ? "Upgrade your subscription" : loggedIn ? "Add a new brand" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {loggedIn
              ? (requirePayment ? "Pay via bKash and we'll activate it." : "Pick a package to get started.")
              : "Start your free trial — we'll create your account and activate it after a quick KYC review."}
          </p>
        </div>

        {/* Packages */}
        {packages.isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(packages.data ?? [])
              .filter((p: any) => {
                // Only the trial package is purchasable from the public order page now.
                // Existing legacy customers can still upgrade their existing brands (handled below).
                if (!p.is_trial) return upgrading; // show legacy packages only when upgrading an existing brand
                const hasBrands = (myBrands.data?.length ?? 0) > 0;
                return !hasBrands && brandChoice === "__new__";
              })
              .map((p: any) => {
              const active = selected === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setSelected(p.id); setDiscount(null); }}
                  className={`text-left rounded-xl border bg-white p-4 transition shadow-sm hover:shadow-md ${active ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{p.name}</h3>
                    {p.is_trial && <Badge variant="secondary">Trial</Badge>}
                  </div>
                  <div className="mt-2 text-2xl font-bold">৳{Number(p.price).toFixed(0)}</div>
                  <p className="text-xs text-muted-foreground">for {p.duration_days} days</p>
                  {p.description && <p className="mt-2 text-xs text-muted-foreground">{p.description}</p>}
                  <ul className="mt-3 space-y-1 text-xs">
                    <li className="flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> {p.device_limit} device{p.device_limit > 1 ? "s" : ""}</li>
                    <li className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5" /> {p.license_count} WordPress license{p.license_count > 1 ? "s" : ""}</li>
                    <li className="flex items-center gap-1.5">
                      {p.message_limit ? <><Calendar className="h-3.5 w-3.5" /> {p.message_limit.toLocaleString()} messages</> : <><InfinityIcon className="h-3.5 w-3.5" /> Unlimited SMS</>}
                    </li>
                  </ul>
                </button>
              );
            })}
          </div>
        )}

        {loggedIn && (myBrands.data?.length ?? 0) > 0 && !upgrading && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 text-sm flex items-center justify-between flex-wrap gap-3">
              <div>
                <strong>Already have a brand?</strong> Top up SMS credits or buy add-ons (extra device / license) from your dashboard.
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm"><Link to="/topup">Top up credits</Link></Button>
                <Button asChild size="sm" variant="outline"><Link to="/credits">View balance</Link></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {selected && pkg && (
          <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardContent className="pt-6 space-y-4">
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                  <strong>Important:</strong> After your account is activated, you must link your own WhatsApp number as a device from the Devices page.
                </div>

                {loggedIn ? (
                  <div>
                    <h3 className="font-semibold mb-3">Apply to</h3>
                    <Select value={brandChoice} onValueChange={setBrandChoice}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(myBrands.data ?? []).map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            Upgrade: {b.name}{b.is_trial ? " (Trial)" : ""} — {b.status}
                          </SelectItem>
                        ))}
                        <SelectItem value="__new__">+ Create a new brand</SelectItem>
                      </SelectContent>
                    </Select>
                    {brandChoice === "__new__" && (
                      <div className="mt-3">
                        <Label>Brand / business name</Label>
                        <Input required value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} />
                      </div>
                    )}
                    <div className="mt-3">
                      <Label>Phone (WhatsApp)</Label>
                      <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01XXXXXXXXX" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-semibold mb-3">Your account</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label>Full name</Label>
                        <Input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                      </div>
                      <div>
                        <Label>Brand / business name</Label>
                        <Input required value={form.brand_name} onChange={(e) => setForm({ ...form, brand_name: e.target.value })} />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                      </div>
                      <div>
                        <Label>Phone (WhatsApp)</Label>
                        <Input required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01XXXXXXXXX" />
                      </div>
                      <div className="sm:col-span-2">
                        <Label>Password</Label>
                        <Input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                        <p className="text-[11px] text-muted-foreground mt-1">Used to sign in once your account is approved.</p>
                      </div>
                      <div>
                        <Label>Document type</Label>
                        <Select
                          value={form.business_doc_type}
                          onValueChange={(v) => setForm({ ...form, business_doc_type: v as "nid" | "trade_license" })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nid">National ID (NID)</SelectItem>
                            <SelectItem value="trade_license">Trade License</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>{form.business_doc_type === "nid" ? "NID number" : "Trade license number"}</Label>
                        <Input
                          required
                          minLength={4}
                          maxLength={64}
                          value={form.business_doc_number}
                          onChange={(e) => setForm({ ...form, business_doc_number: e.target.value })}
                          placeholder={form.business_doc_type === "nid" ? "e.g. 1234567890123" : "e.g. TRAD/DSCC/123456"}
                        />
                        <p className="text-[11px] text-muted-foreground mt-1">Required for KYC verification.</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t pt-4">
                  <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Coupon code (optional)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input value={form.coupon_code} onChange={(e) => { setForm({ ...form, coupon_code: e.target.value }); setDiscount(null); }} placeholder="ENTER CODE" />
                    <Button type="button" variant="outline" onClick={checkCoupon} disabled={couponChecking || !form.coupon_code.trim()}>
                      {couponChecking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                    </Button>
                  </div>
                  {discount?.valid && <p className="text-xs text-emerald-600 mt-1">✓ Coupon applied — saved ৳{discount.discount}</p>}
                </div>

                {requirePayment ? (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-2">bKash payment</h3>
                    <div className="rounded-lg bg-pink-50 border border-pink-200 p-3 text-sm">
                      <p className="font-medium text-pink-900">Payment to Merchant</p>
                      <p className="text-2xl font-bold text-pink-700 mt-1">{BKASH_NUMBER}</p>
                      <p className="text-xs text-pink-900/70 mt-1">Pay <strong>৳{final.toFixed(0)}</strong> using bKash → "Payment", then enter the TXID below.</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3 mt-3">
                      <div>
                        <Label>Your bKash number</Label>
                        <Input required value={form.bkash_number} onChange={(e) => setForm({ ...form, bkash_number: e.target.value })} placeholder="01XXXXXXXXX" />
                      </div>
                      <div>
                        <Label>Transaction ID (TrxID)</Label>
                        <Input required value={form.txid} onChange={(e) => setForm({ ...form, txid: e.target.value })} placeholder="e.g. AB12CD34EF" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-t pt-4">
                    <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm">
                      <p className="font-medium text-emerald-900">No payment required</p>
                      <p className="text-xs text-emerald-900/70 mt-1">Your total is ৳0 — just place the order and we'll activate your account shortly.</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="h-fit">
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-semibold">Order summary</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Package</span>
                  <span className="font-medium">{pkg.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span>{pkg.duration_days} days</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price</span>
                  <span>৳{original.toFixed(0)}</span>
                </div>
                {discount?.valid && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount</span>
                    <span>−৳{discount.discount}</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between font-semibold">
                  <span>Total</span>
                  <span>৳{final.toFixed(0)}</span>
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : upgrading ? "Upgrade plan" : "Place Order"}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  {requirePayment
                    ? "By placing the order you confirm you've sent the bKash payment. We verify and activate within a few hours."
                    : "Your order will be reviewed by our team and activated shortly."}
                </p>
              </CardContent>
            </Card>
          </form>
        )}
      </main>
    </div>
  );
}
