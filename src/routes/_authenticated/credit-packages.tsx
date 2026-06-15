import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Package, Save, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/layout/page-header";
import {
  adminListCreditPackages,
  adminUpsertCreditPackage,
  adminGetLowBalanceSettings,
  adminUpdateLowBalanceSettings,
} from "@/lib/credits.functions";

export const Route = createFileRoute("/_authenticated/credit-packages")({
  head: () => ({ meta: [{ title: "Credit Packages — WA Suite" }] }),
  component: CreditPackagesAdmin,
});

function CreditPackagesAdmin() {
  const fnList = useServerFn(adminListCreditPackages);
  const fnUpsert = useServerFn(adminUpsertCreditPackage);
  const fnGetSettings = useServerFn(adminGetLowBalanceSettings);
  const fnUpdateSettings = useServerFn(adminUpdateLowBalanceSettings);
  const qc = useQueryClient();

  const list = useQuery({ queryKey: ["admin-credit-packages"], queryFn: () => fnList() });
  const settings = useQuery({ queryKey: ["low-balance-settings"], queryFn: () => fnGetSettings() });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader icon={Package} title="Credit Packages" description="Set per-credit rates, minimum top-ups, and limits per pack." />

      <div className="space-y-3">
        {(list.data ?? []).map((p: any) => (
          <PackageRow key={p.id} pkg={p} fnUpsert={fnUpsert} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-credit-packages"] })} />
        ))}
        <PackageRow pkg={null} fnUpsert={fnUpsert} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-credit-packages"] })} />
      </div>

      <LowBalanceSettings settings={settings.data} fnUpdate={fnUpdateSettings} onSaved={() => qc.invalidateQueries({ queryKey: ["low-balance-settings"] })} />
    </div>
  );
}

function PackageRow({ pkg, fnUpsert, onSaved }: { pkg: any | null; fnUpsert: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    code: pkg?.code ?? "",
    name: pkg?.name ?? "",
    tk_per_credit: pkg?.tk_per_credit ?? 0.8,
    min_topup_tk: pkg?.min_topup_tk ?? 500,
    device_limit: pkg?.device_limit ?? 1,
    wp_site_limit: pkg?.wp_site_limit ?? 3,
    is_active: pkg?.is_active ?? true,
    sort_order: pkg?.sort_order ?? 0,
  });
  useEffect(() => {
    if (pkg) setForm({
      code: pkg.code, name: pkg.name,
      tk_per_credit: Number(pkg.tk_per_credit), min_topup_tk: Number(pkg.min_topup_tk),
      device_limit: pkg.device_limit, wp_site_limit: pkg.wp_site_limit,
      is_active: pkg.is_active, sort_order: pkg.sort_order ?? 0,
    });
  }, [pkg?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const mut = useMutation({
    mutationFn: () => fnUpsert({
      data: {
        id: pkg?.id ?? null,
        code: form.code, name: form.name,
        tk_per_credit: Number(form.tk_per_credit), min_topup_tk: Number(form.min_topup_tk),
        device_limit: Number(form.device_limit), wp_site_limit: Number(form.wp_site_limit),
        is_active: form.is_active, sort_order: Number(form.sort_order),
      },
    }),
    onSuccess: () => { toast.success("Saved"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{pkg ? pkg.name : "+ New package"}</div>
          <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><Label className="text-xs">Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="sme" /></div>
          <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="SME Pack" /></div>
          <div><Label className="text-xs">৳ / credit</Label><Input type="number" step="0.01" value={form.tk_per_credit} onChange={(e) => setForm({ ...form, tk_per_credit: e.target.value as any })} /></div>
          <div><Label className="text-xs">Min top-up (৳)</Label><Input type="number" value={form.min_topup_tk} onChange={(e) => setForm({ ...form, min_topup_tk: e.target.value as any })} /></div>
          <div><Label className="text-xs">Devices</Label><Input type="number" value={form.device_limit} onChange={(e) => setForm({ ...form, device_limit: e.target.value as any })} /></div>
          <div><Label className="text-xs">WP sites</Label><Input type="number" value={form.wp_site_limit} onChange={(e) => setForm({ ...form, wp_site_limit: e.target.value as any })} /></div>
          <div><Label className="text-xs">Sort</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value as any })} /></div>
          <div className="flex items-end">
            <Button onClick={() => mut.mutate()} disabled={mut.isPending} className="w-full">
              <Save className="h-4 w-4 mr-1" /> Save
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LowBalanceSettings({ settings, fnUpdate, onSaved }: { settings: any; fnUpdate: any; onSaved: () => void }) {
  const [form, setForm] = useState({
    low_balance_threshold: 100,
    low_balance_wa_template: "",
    zero_balance_wa_template: "",
  });
  useEffect(() => {
    if (settings) setForm({
      low_balance_threshold: settings.low_balance_threshold ?? 100,
      low_balance_wa_template: settings.low_balance_wa_template ?? "",
      zero_balance_wa_template: settings.zero_balance_wa_template ?? "",
    });
  }, [settings?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const mut = useMutation({
    mutationFn: () => fnUpdate({ data: {
      low_balance_threshold: Number(form.low_balance_threshold),
      low_balance_wa_template: form.low_balance_wa_template,
      zero_balance_wa_template: form.zero_balance_wa_template,
    } }),
    onSuccess: () => { toast.success("Settings saved"); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 font-semibold"><Settings2 className="h-4 w-4" /> Low-balance alerts</div>
        <div><Label className="text-xs">Threshold (credits)</Label><Input type="number" value={form.low_balance_threshold} onChange={(e) => setForm({ ...form, low_balance_threshold: e.target.value as any })} /></div>
        <div><Label className="text-xs">Low-balance WhatsApp template</Label><Textarea rows={2} value={form.low_balance_wa_template} onChange={(e) => setForm({ ...form, low_balance_wa_template: e.target.value })} /></div>
        <div><Label className="text-xs">Zero-balance WhatsApp template</Label><Textarea rows={2} value={form.zero_balance_wa_template} onChange={(e) => setForm({ ...form, zero_balance_wa_template: e.target.value })} /></div>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}><Save className="h-4 w-4 mr-1" /> Save settings</Button>
      </CardContent>
    </Card>
  );
}
