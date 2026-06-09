import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Tag, Plus, Loader2, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { listCoupons, upsertCoupon, deleteCoupon } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/coupons")({
  head: () => ({ meta: [{ title: "Coupons" }] }),
  component: CouponsPage,
});

type Form = {
  id?: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: string;
  expires_at: string;
  is_active: boolean;
};
const empty: Form = { code: "", discount_type: "percent", discount_value: 10, max_uses: "", expires_at: "", is_active: true };

function CouponsPage() {
  const qc = useQueryClient();
  const fnList = useServerFn(listCoupons);
  const fnUpsert = useServerFn(upsertCoupon);
  const fnDel = useServerFn(deleteCoupon);
  const list = useQuery({ queryKey: ["coupons"], queryFn: () => fnList() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);

  const save = useMutation({
    mutationFn: () => fnUpsert({
      data: {
        id: form.id,
        code: form.code,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses: form.max_uses === "" ? null : Number(form.max_uses),
        expires_at: form.expires_at === "" ? null : new Date(form.expires_at).toISOString(),
        is_active: form.is_active,
      },
    }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["coupons"] }); setOpen(false); },
    onError: (e) => toast.error((e as Error).message),
  });
  const del = useMutation({
    mutationFn: (id: string) => fnDel({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["coupons"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  function edit(c: any) {
    setForm({
      id: c.id, code: c.code, discount_type: c.discount_type, discount_value: Number(c.discount_value),
      max_uses: c.max_uses == null ? "" : String(c.max_uses),
      expires_at: c.expires_at ? new Date(c.expires_at).toISOString().slice(0, 16) : "",
      is_active: c.is_active,
    });
    setOpen(true);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader icon={Tag} title="Coupons" description="Discount codes customers can use at checkout."
        actions={<Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> New coupon</Button>}
      />
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Code</TableHead><TableHead>Discount</TableHead><TableHead>Used</TableHead>
            <TableHead>Expires</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(list.data ?? []).map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono font-medium">{c.code}</TableCell>
                <TableCell>{c.discount_type === "percent" ? `${c.discount_value}%` : `৳${c.discount_value}`}</TableCell>
                <TableCell>{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""}</TableCell>
                <TableCell className="text-xs">{c.expires_at ? new Date(c.expires_at).toLocaleString() : "Never"}</TableCell>
                <TableCell><Badge variant={c.is_active ? "default" : "outline"}>{c.is_active ? "Active" : "Off"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => edit(c)}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => confirm("Delete coupon?") && del.mutate(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {!list.isLoading && (list.data ?? []).length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No coupons yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? "Edit coupon" : "New coupon"}</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE10" /></div>
            <div>
              <Label>Discount type</Label>
              <Select value={form.discount_type} onValueChange={(v: any) => setForm({ ...form, discount_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percent (%)</SelectItem>
                  <SelectItem value="fixed">Fixed (৳)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Value</Label><Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })} /></div>
            <div><Label>Max uses (blank = unlimited)</Label><Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} /></div>
            <div><Label>Expires (blank = never)</Label><Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} /></div>
            <div className="flex items-center gap-2 sm:col-span-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
