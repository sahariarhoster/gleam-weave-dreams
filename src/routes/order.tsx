import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Check, MessageCircle, Smartphone, Infinity as InfinityIcon, KeyRound, Calendar, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listActivePackages, validateCoupon, createOrder } from "@/lib/orders.functions";

const BKASH_NUMBER = "01407168338";

export const Route = createFileRoute("/order")({
  ssr: false,
  head: () => ({ meta: [{ title: "Place an Order — WA Suite" }] }),
  component: OrderPage,
});

function OrderPage() {
  const fnList = useServerFn(listActivePackages);
  const fnCoupon = useServerFn(validateCoupon);
  const fnCreate = useServerFn(createOrder);
  const navigate = useNavigate();

  const packages = useQuery({ queryKey: ["public-packages"], queryFn: () => fnList() });

  const [selected, setSelected] = useState<string>("");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    brand_name: "",
    bkash_number: "",
    txid: "",
    coupon_code: "",
  });
  const [discount, setDiscount] = useState<{ valid: boolean; discount?: number; final?: number; error?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [couponChecking, setCouponChecking] = useState(false);
  const [done, setDone] = useState(false);

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return toast.error("Pick a package");
    setSubmitting(true);
    try {
      await fnCreate({
        data: {
          package_id: selected,
          full_name: form.full_name,
          email: form.email,
          password: form.password,
          phone: form.phone || null,
          brand_name: form.brand_name,
          bkash_number: form.bkash_number,
          txid: form.txid,
          coupon_code: form.coupon_code || null,
        },
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 space-y-4 text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 grid place-content-center">
              <Check className="h-7 w-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold">Order placed!</h2>
            <p className="text-sm text-muted-foreground">
              Your account has been created. We'll verify your bKash payment and activate it within a few hours.
              You can sign in now to track status — your account will show "Pending" until approved.
            </p>
            <Button onClick={() => navigate({ to: "/auth" })} className="w-full">Go to sign in</Button>
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
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Already have an account? Sign in</Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Choose a package</h1>
          <p className="text-sm text-muted-foreground">Pay via bKash, share your transaction ID, and we'll activate your account.</p>
        </div>

        {/* Packages */}
        {packages.isLoading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(packages.data ?? []).map((p: any) => {
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

        {selected && pkg && (
          <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
            {/* Form */}
            <Card className="lg:col-span-2">
              <CardContent className="pt-6 space-y-4">
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
                      <Label>Phone (optional)</Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Password</Label>
                      <Input required type="password" minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                      <p className="text-[11px] text-muted-foreground mt-1">Used to sign in once your account is approved.</p>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">bKash payment</h3>
                  <div className="rounded-lg bg-pink-50 border border-pink-200 p-3 text-sm">
                    <p className="font-medium text-pink-900">Send Money to (Merchant)</p>
                    <p className="text-2xl font-bold text-pink-700 mt-1">{BKASH_NUMBER}</p>
                    <p className="text-xs text-pink-900/70 mt-1">Send <strong>৳{final.toFixed(0)}</strong> using bKash → "Send Money", then enter the TXID below.</p>
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
              </CardContent>
            </Card>

            {/* Summary */}
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
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Place Order"}
                </Button>
                <p className="text-[11px] text-muted-foreground">By placing the order you confirm you've sent the bKash payment. We verify and activate within a few hours.</p>
              </CardContent>
            </Card>
          </form>
        )}
      </main>
    </div>
  );
}
