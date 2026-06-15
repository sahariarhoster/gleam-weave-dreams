import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Building2, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { listBrandsClient, createBrandClient, updateBrandClient, deleteBrandClient } from "@/lib/client-queries";


export const Route = createFileRoute("/_authenticated/brands")({
  head: () => ({ meta: [{ title: "Brands — WA Suite" }] }),
  component: BrandsPage,
});

type Brand = {
  id: string; name: string; status: string;
  expires_at: string | null; message_limit: number | null; device_limit: number;
  devices_count?: number; members_count?: number;
};

function BrandsPage() {
  const qc = useQueryClient();
  const brands = useQuery({ queryKey: ["brands"], queryFn: listBrandsClient });


  const [editing, setEditing] = useState<Brand | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const q = query.trim().toLowerCase();
  const filtered = (brands.data ?? []).filter((b: any) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (!q) return true;
    return b.name?.toLowerCase().includes(q) || b.status?.toLowerCase().includes(q);
  });

  const allIds: string[] = filtered.map((b: any) => b.id as string);
  const allSelected = allIds.length > 0 && allIds.every((id: string) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;
  const toggleAll = (on: boolean) => setSelected(on ? new Set<string>(allIds) : new Set<string>());
  const toggleOne = (id: string, on: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id); else next.delete(id);
      return next;
    });
  };

  const delMut = useMutation({
    mutationFn: (id: string) => deleteBrandClient(id),
    onSuccess: () => { toast.success("Brand deleted"); qc.invalidateQueries({ queryKey: ["brands"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const bulkDelMut = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(ids.map((id) => deleteBrandClient(id)));
      const failed = results.filter((r) => r.status === "rejected").length;
      return { ok: ids.length - failed, failed };
    },
    onSuccess: (r) => {
      if (r.failed === 0) toast.success(`Deleted ${r.ok} brand${r.ok === 1 ? "" : "s"}`);
      else toast.warning(`Deleted ${r.ok}, failed ${r.failed}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["brands"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        icon={Building2}
        title="Brands"
        description="Each brand groups its own devices, contacts, campaigns and members."
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Brand</Button>
            </DialogTrigger>
            <BrandDialog key={editing?.id ?? "new"} editing={editing} onDone={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["brands"] }); }} />
          </Dialog>
        }
      />
      <Card className="border-border/60 shadow-sm">
        <CardContent className="pt-6">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative max-w-sm flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search brands…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            {selected.size > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{selected.size} selected</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 gap-1 text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {selected.size} brand{selected.size === 1 ? "" : "s"}?</AlertDialogTitle>
                      <AlertDialogDescription>All contacts, groups, campaigns and devices linked to these brands will be deleted.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => bulkDelMut.mutate(Array.from(selected))} className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={(v) => toggleAll(!!v)}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Devices</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Msg Limit</TableHead>
                <TableHead>Device Limit</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {brands.isLoading && <TableRow><TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!brands.isLoading && (brands.data?.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">No brands yet.</TableCell></TableRow>
              )}
              {!brands.isLoading && filtered.length === 0 && (brands.data?.length ?? 0) > 0 && (
                <TableRow><TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">No brands match your filters.</TableCell></TableRow>
              )}
              {filtered.map((b: any) => (
                <TableRow key={b.id} data-state={selected.has(b.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(b.id)}
                      onCheckedChange={(v) => toggleOne(b.id, !!v)}
                      aria-label={`Select ${b.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>
                    <Badge className={
                      b.status === "active" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                      : b.status === "expired" ? "bg-rose-100 text-rose-700 hover:bg-rose-100"
                      : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                    }>{b.status}</Badge>
                  </TableCell>
                  <TableCell>{b.devices_count ?? 0}</TableCell>
                  <TableCell>{b.members_count ?? 0}</TableCell>
                  <TableCell>{b.message_limit ?? "∞"}</TableCell>
                  <TableCell>{b.device_limit}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {b.expires_at ? format(new Date(b.expires_at), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(b); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete brand?</AlertDialogTitle>
                            <AlertDialogDescription>All contacts, groups, campaigns and devices linked to this brand will be deleted.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => delMut.mutate(b.id)} className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function BrandDialog({ editing, onDone }: { editing: Brand | null; onDone: () => void }) {
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    status: editing?.status ?? "active",
    expires_at: editing?.expires_at ? editing.expires_at.slice(0, 10) : "",
    message_limit: editing?.message_limit?.toString() ?? "",
    device_limit: editing?.device_limit?.toString() ?? "1",
  });
  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        status: form.status,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        message_limit: form.message_limit ? parseInt(form.message_limit, 10) : null,
        device_limit: parseInt(form.device_limit, 10) || 1,
      };
      if (editing) return updateBrandClient({ id: editing.id, ...payload });
      return createBrandClient(payload);
    },
    onSuccess: () => { toast.success(editing ? "Brand updated" : "Brand created"); onDone(); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "Edit Brand" : "Add Brand"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
        <div className="space-y-1.5"><Label>Brand Name</Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Expires At</Label>
            <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            <div className="flex gap-1.5 pt-1">
              {[
                { label: "1 month", months: 1 },
                { label: "3 months", months: 3 },
                { label: "6 months", months: 6 },
                { label: "1 year", months: 12 },
              ].map((p) => (
                <Button
                  key={p.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const d = new Date();
                    d.setMonth(d.getMonth() + p.months);
                    setForm({ ...form, expires_at: d.toISOString().slice(0, 10) });
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Message Limit</Label>
            <Input type="number" min={0} placeholder="Unlimited" value={form.message_limit} onChange={(e) => setForm({ ...form, message_limit: e.target.value })} />
          </div>
          <div className="space-y-1.5"><Label>Device Limit</Label>
            <Input type="number" min={1} required value={form.device_limit} onChange={(e) => setForm({ ...form, device_limit: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={mut.isPending} className="w-full">
            {mut.isPending ? "Saving…" : editing ? "Save Changes" : "Create Brand"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
