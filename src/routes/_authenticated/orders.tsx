import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShoppingBag, Check, X, Loader2, Ban, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { listOrders, decideOrder, adminCreateOrder, listAllPackages, searchCustomers } from "@/lib/orders.functions";

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({ meta: [{ title: "Orders" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const qc = useQueryClient();
  const fnList = useServerFn(listOrders);
  const fnDecide = useServerFn(decideOrder);
  const list = useQuery({ queryKey: ["admin-orders"], queryFn: () => fnList() });
  const [editing, setEditing] = useState<{ id: string; action: "approve" | "reject" | "cancel" } | null>(null);
  const [notes, setNotes] = useState("");

  const decide = useMutation({
    mutationFn: (v: { id: string; action: "approve" | "reject" | "cancel"; notes?: string }) =>
      fnDecide({ data: { id: v.id, action: v.action, notes: v.notes ?? null } }),
    onSuccess: () => {
      toast.success("Done");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      setEditing(null);
      setNotes("");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <PageHeader icon={ShoppingBag} title="Orders" description="Review and approve customer orders." />
        <CreateOrderDialog onCreated={() => qc.invalidateQueries({ queryKey: ["admin-orders"] })} />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>bKash</TableHead>
                <TableHead>TXID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list.data ?? []).map((o: any) => (
                <TableRow key={o.id}>
                  <TableCell className="text-xs">{new Date(o.created_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="font-medium">{o.full_name}</div>
                    <div className="text-xs text-muted-foreground">{o.email}</div>
                    <div className="text-xs text-muted-foreground">{o.brand_name}</div>
                  </TableCell>
                  <TableCell className="text-sm">{o.phone ? <a href={`tel:${o.phone}`} className="hover:underline">{o.phone}</a> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>
                    <div>{o.package_name}</div>
                    <div className="text-xs text-muted-foreground">{o.duration_days} days</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">৳{Number(o.final_amount).toFixed(0)}</div>
                    {Number(o.discount_amount) > 0 && (
                      <div className="text-[11px] text-emerald-600">−৳{Number(o.discount_amount)}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{o.bkash_number}</TableCell>
                  <TableCell className="text-xs font-mono">{o.txid}</TableCell>
                  <TableCell>
                    <Badge variant={o.status === "approved" ? "default" : o.status === "rejected" ? "destructive" : "secondary"}>
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex justify-end gap-1">
                        {o.status !== "approved" && (
                          <Button size="sm" onClick={() => { setEditing({ id: o.id, action: "approve" }); setNotes(o.admin_notes ?? ""); }} title="Approve">
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {o.status !== "cancelled" && (
                          <Button size="sm" variant="outline" onClick={() => { setEditing({ id: o.id, action: "cancel" }); setNotes(o.admin_notes ?? ""); }} title="Cancel">
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {o.status !== "rejected" && (
                          <Button size="sm" variant="destructive" onClick={() => { setEditing({ id: o.id, action: "reject" }); setNotes(o.admin_notes ?? ""); }} title="Reject">
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      {o.admin_notes && o.status !== "pending" && (
                        <span className="text-[11px] text-muted-foreground max-w-[220px] truncate" title={o.admin_notes}>
                          {o.admin_notes}
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!list.isLoading && (list.data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No orders yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.action === "approve" ? "Approve order" : editing?.action === "cancel" ? "Cancel order" : "Reject order"}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder={editing?.action === "reject" ? "Reason shown to the customer (required)" : "Notes (optional)"}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              variant={editing?.action === "reject" ? "destructive" : "default"}
              disabled={decide.isPending || (editing?.action === "reject" && notes.trim().length < 3)}
              onClick={() => editing && decide.mutate({ id: editing.id, action: editing.action, notes: notes || undefined })}
            >
              {decide.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CreateOrderDialog({
  onCreated,
  triggerLabel = "Add order",
  autoApprove = false,
  title = "Create order manually",
  description = "Create an order for a customer. They'll get access once approved.",
}: {
  onCreated?: (res: { order_id: string; brand_id: string }) => void;
  triggerLabel?: string;
  autoApprove?: boolean;
  title?: string;
  description?: string;
}) {
  const [open, setOpen] = useState(false);
  const fnCreate = useServerFn(adminCreateOrder);
  const fnPkgs = useServerFn(listAllPackages);
  const fnSearch = useServerFn(searchCustomers);
  const pkgs = useQuery({ queryKey: ["all-packages"], queryFn: () => fnPkgs(), enabled: open });

  const [mode, setMode] = useState<"new" | "existing">("new");
  const [search, setSearch] = useState("");
  const customers = useQuery({
    queryKey: ["search-customers", search],
    queryFn: () => fnSearch({ data: { q: search } }),
    enabled: open && mode === "existing",
  });
  const [picked, setPicked] = useState<{ id: string; email: string; full_name: string | null; phone: string | null; brands: { id: string; name: string; status: string }[] } | null>(null);
  const [pickedBrandId, setPickedBrandId] = useState<string>("__new__");

  const [form, setForm] = useState({
    package_id: "",
    full_name: "",
    email: "",
    password: "",
    phone: "",
    brand_name: "",
    notes: "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const reset = () => {
    setForm({ package_id: "", full_name: "", email: "", password: "", phone: "", brand_name: "", notes: "" });
    setMode("new"); setSearch(""); setPicked(null); setPickedBrandId("__new__");
  };

  const create = useMutation({
    mutationFn: () =>
      fnCreate({
        data: {
          package_id: form.package_id,
          full_name: mode === "existing" && picked ? (picked.full_name ?? form.full_name) : form.full_name,
          email: mode === "existing" && picked ? picked.email : form.email,
          password: mode === "new" ? (form.password || null) : null,
          phone: mode === "existing" && picked ? (picked.phone ?? null) : (form.phone || null),
          brand_name: form.brand_name || picked?.brands.find((b) => b.id === pickedBrandId)?.name || "—",
          brand_id: mode === "existing" && pickedBrandId !== "__new__" ? pickedBrandId : null,
          user_id: mode === "existing" && picked ? picked.id : null,
          notes: form.notes || null,
          auto_approve: autoApprove,
        },
      }),
    onSuccess: (res) => {
      toast.success(autoApprove ? "Subscription created" : "Order created");
      setOpen(false);
      reset();
      onCreated?.(res as any);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const valid =
    !!form.package_id &&
    (mode === "existing"
      ? !!picked && (pickedBrandId !== "__new__" || form.brand_name.trim().length > 0)
      : form.full_name.trim().length >= 2 && /.+@.+/.test(form.email) && form.brand_name.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 h-4 w-4" />{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Button type="button" size="sm" variant={mode === "new" ? "default" : "outline"} onClick={() => setMode("new")}>New customer</Button>
          <Button type="button" size="sm" variant={mode === "existing" ? "default" : "outline"} onClick={() => setMode("existing")}>Existing customer</Button>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Package</Label>
            <Select value={form.package_id} onValueChange={(v) => setForm((f) => ({ ...f, package_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
              <SelectContent>
                {(pkgs.data ?? []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} — ৳{p.price} / {p.duration_days}d</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === "existing" ? (
            <>
              <div className="grid gap-1.5">
                <Label>Search customer (email, name, phone)</Label>
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to search…" />
                {customers.data && customers.data.length > 0 && !picked && (
                  <div className="max-h-40 overflow-y-auto rounded-md border">
                    {customers.data.map((c: any) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setPicked(c); setPickedBrandId(c.brands[0]?.id ?? "__new__"); }}
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <div className="font-medium">{c.full_name || c.email}</div>
                        <div className="text-xs text-muted-foreground">{c.email}{c.phone ? ` · ${c.phone}` : ""} · {c.brands.length} brand(s)</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {picked && (
                <div className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{picked.full_name || picked.email}</div>
                      <div className="text-xs text-muted-foreground">{picked.email}</div>
                    </div>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setPicked(null)}>Change</Button>
                  </div>
                  <div className="mt-2 grid gap-1.5">
                    <Label>Apply to brand</Label>
                    <Select value={pickedBrandId} onValueChange={setPickedBrandId}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {picked.brands.map((b) => (
                          <SelectItem key={b.id} value={b.id}>Upgrade: {b.name} ({b.status})</SelectItem>
                        ))}
                        <SelectItem value="__new__">+ Create new brand</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {pickedBrandId === "__new__" && (
                    <div className="mt-2 grid gap-1.5">
                      <Label>New brand name</Label>
                      <Input value={form.brand_name} onChange={set("brand_name")} />
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Full name</Label>
                <Input value={form.full_name} onChange={set("full_name")} />
              </div>
              <div className="grid gap-1.5">
                <Label>Brand name</Label>
                <Input value={form.brand_name} onChange={set("brand_name")} />
              </div>
              <div className="grid gap-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={set("email")} />
              </div>
              <div className="grid gap-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={set("phone")} />
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Password (blank = auto-generate)</Label>
                <Input type="text" value={form.password} onChange={set("password")} placeholder="Leave blank to auto-generate" />
              </div>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label>Internal note</Label>
            <Textarea value={form.notes} onChange={set("notes")} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!valid || create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : autoApprove ? "Create subscription" : "Create order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
