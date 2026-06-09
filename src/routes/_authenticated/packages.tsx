import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Package, Plus, Loader2, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { listAllPackages, upsertPackage, deletePackage } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/packages")({
  head: () => ({ meta: [{ title: "Packages" }] }),
  component: PackagesPage,
});

type Form = {
  id?: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  device_limit: number;
  message_limit: string; // "" = unlimited
  license_count: number;
  is_trial: boolean;
  is_active: boolean;
  sort_order: number;
};

const empty: Form = { name: "", description: "", price: 0, duration_days: 30, device_limit: 1, message_limit: "", license_count: 1, is_trial: false, is_active: true, sort_order: 0 };

function PackagesPage() {
  const qc = useQueryClient();
  const fnList = useServerFn(listAllPackages);
  const fnUpsert = useServerFn(upsertPackage);
  const fnDel = useServerFn(deletePackage);
  const list = useQuery({ queryKey: ["all-packages"], queryFn: () => fnList() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(empty);

  const save = useMutation({
    mutationFn: () => fnUpsert({
      data: {
        id: form.id,
        name: form.name,
        description: form.description || null,
        price: Number(form.price),
        duration_days: Number(form.duration_days),
        device_limit: Number(form.device_limit),
        message_limit: form.message_limit === "" ? null : Number(form.message_limit),
        license_count: Number(form.license_count),
        is_trial: form.is_trial,
        is_active: form.is_active,
        sort_order: Number(form.sort_order),
      },
    }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["all-packages"] }); setOpen(false); },
    onError: (e) => toast.error((e as Error).message),
  });
  const del = useMutation({
    mutationFn: (id: string) => fnDel({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["all-packages"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  function edit(p: any) {
    setForm({
      id: p.id, name: p.name, description: p.description ?? "",
      price: Number(p.price), duration_days: p.duration_days, device_limit: p.device_limit,
      message_limit: p.message_limit == null ? "" : String(p.message_limit),
      license_count: p.license_count, is_trial: p.is_trial, is_active: p.is_active, sort_order: p.sort_order,
    });
    setOpen(true);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <PageHeader icon={Package} title="Packages" description="Manage packages shown on the public order page."
        action={<Button onClick={() => { setForm(empty); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> New package</Button>}
      />
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Name</TableHead><TableHead>Price</TableHead><TableHead>Duration</TableHead>
            <TableHead>Devices</TableHead><TableHead>Licenses</TableHead><TableHead>Messages</TableHead>
            <TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {(list.data ?? []).map((p: any) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="font-medium">{p.name} {p.is_trial && <Badge variant="secondary" className="ml-1">Trial</Badge>}</div>
                  {p.description && <div className="text-xs text-muted-foreground">{p.description}</div>}
                </TableCell>
                <TableCell>৳{Number(p.price).toFixed(0)}</TableCell>
                <TableCell>{p.duration_days} days</TableCell>
                <TableCell>{p.device_limit}</TableCell>
                <TableCell>{p.license_count}</TableCell>
                <TableCell>{p.message_limit ?? "Unlimited"}</TableCell>
                <TableCell><Badge variant={p.is_active ? "default" : "outline"}>{p.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => edit(p)}><Edit className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => confirm("Delete this package?") && del.mutate(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{form.id ? "Edit package" : "New package"}</DialogTitle></DialogHeader>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="sm:col-span-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Price (৳)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></div>
            <div><Label>Duration (days)</Label><Input type="number" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })} /></div>
            <div><Label>Device limit</Label><Input type="number" value={form.device_limit} onChange={(e) => setForm({ ...form, device_limit: Number(e.target.value) })} /></div>
            <div><Label>License count</Label><Input type="number" value={form.license_count} onChange={(e) => setForm({ ...form, license_count: Number(e.target.value) })} /></div>
            <div><Label>Message limit (blank = unlimited)</Label><Input type="number" value={form.message_limit} onChange={(e) => setForm({ ...form, message_limit: e.target.value })} /></div>
            <div><Label>Sort order</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_trial} onCheckedChange={(v) => setForm({ ...form, is_trial: v })} /><Label>Trial</Label></div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Active</Label></div>
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
