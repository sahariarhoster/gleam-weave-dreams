import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  listAllSubscriptions,
  listMySubscriptions,
  adminUpdateSubscription,
  requestCancelSubscription,
} from "@/lib/subscriptions.functions";
import { listAllPackages } from "@/lib/orders.functions";
import { CreateOrderDialog } from "./orders";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/subscriptions")({
  component: SubscriptionsPage,
});

function fmtDate(s: string | null | undefined) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString();
}
function StatusBadge({ s }: { s: string | null }) {
  const color =
    s === "active" ? "default" :
    s === "suspended" ? "destructive" :
    s === "on_hold" ? "destructive" :
    s === "pending" ? "secondary" : "outline";
  return <Badge variant={color as any}>{s ?? "—"}</Badge>;
}

function SubscriptionsPage() {
  const { user } = useAuth();
  const roles = useQuery({
    queryKey: ["my-roles", user?.id ?? "anon"],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return (data ?? []).map((r) => r.role as string);
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
  const r = roles.data ?? [];
  const canManage = r.includes("owner") || r.includes("support_agent") || r.includes("sales_agent");

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">
          {canManage ? "Manage all customer subscriptions." : "Your active subscriptions."}
        </p>
      </div>
      {canManage ? <AdminView /> : <CustomerView />}
    </div>
  );
}

/* ---------------- Admin View ---------------- */

function AdminView() {
  const qc = useQueryClient();
  const fnList = useServerFn(listAllSubscriptions);
  const fnPkgs = useServerFn(listAllPackages);
  const fnUpdate = useServerFn(adminUpdateSubscription);

  const q = useQuery({ queryKey: ["subs-admin"], queryFn: () => fnList({ data: undefined as any }) });
  const pkgs = useQuery({ queryKey: ["all-packages"], queryFn: () => fnPkgs({ data: undefined as any }) });

  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const rows = useMemo(() => {
    let list = q.data ?? [];
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter((x: any) =>
        (x.brand_name ?? "").toLowerCase().includes(s) ||
        (x.owner?.full_name ?? "").toLowerCase().includes(s) ||
        (x.owner?.email ?? "").toLowerCase().includes(s),
      );
    }
    if (filter === "all") return list;
    if (filter === "cancel_requested") return list.filter((x: any) => x.cancel_requested_at);
    return list.filter((x: any) => x.status === filter);
  }, [q.data, filter, search]);

  const m = useMutation({
    mutationFn: (args: any) => fnUpdate({ data: args }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["subs-admin"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allIds: string[] = rows.map((s: any) => s.id as string);
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

  const bulkMut = useMutation({
    mutationFn: async (payloads: any[]) => {
      const results = await Promise.allSettled(payloads.map((p) => fnUpdate({ data: p })));
      const failed = results.filter((r) => r.status === "rejected").length;
      return { ok: payloads.length - failed, failed };
    },
    onSuccess: (r) => {
      if (r.failed === 0) toast.success(`Applied to ${r.ok} subscription${r.ok === 1 ? "" : "s"}`);
      else toast.warning(`Applied to ${r.ok}, failed ${r.failed}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["subs-admin"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const runBulk = (action: string, extra: Record<string, any> = {}) =>
    bulkMut.mutate(Array.from(selected).map((id) => ({ brand_id: id, action, ...extra })));

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">All Subscriptions</CardTitle>
          <CardDescription>Suspend, activate, renew, or change package.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CreateOrderDialog
            autoApprove
            triggerLabel="Add subscription"
            title="Create subscription manually"
            description="Creates an active brand & subscription for the customer immediately."
            onCreated={() => qc.invalidateQueries({ queryKey: ["subs-admin"] })}
          />
          <Input
            placeholder="Search brand or owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-56"
          />
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="on_hold">On hold</SelectItem>
              <SelectItem value="cancel_requested">Cancellation requested</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {selected.size > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <Button size="sm" variant="outline" disabled={bulkMut.isPending} onClick={() => runBulk("activate")}>Activate</Button>
            <Button size="sm" variant="outline" disabled={bulkMut.isPending} onClick={() => runBulk("suspend")}>Suspend</Button>
            <Button size="sm" variant="outline" disabled={bulkMut.isPending} onClick={() => runBulk("hold")}>Hold</Button>
            <Button size="sm" variant="outline" disabled={bulkMut.isPending} onClick={() => runBulk("clear_cancel")}>Dismiss cancel</Button>
            <RenewDialog
              brandName={`${selected.size} subscription${selected.size === 1 ? "" : "s"}`}
              defaultDays={30}
              onSubmit={(extend_days) => runBulk("renew", { extend_days })}
              triggerLabel="Bulk renew"
            />
            <ChangePackageDialog
              brandId="bulk"
              currentPkgId={null}
              packages={pkgs.data ?? []}
              onSubmit={(package_id) => runBulk("change_package", { package_id })}
              triggerLabel="Bulk change package"
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="secondary" disabled={bulkMut.isPending}>To credits</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Shift {selected.size} to credits?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Each selected brand will stop using its subscription package and consume credits per SMS. Wallets start at 0.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => runBulk("convert_to_credits")}>Shift to credits</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}
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
              <TableHead>Brand</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && <TableRow><TableCell colSpan={7}>Loading…</TableCell></TableRow>}
            {!q.isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-muted-foreground">No subscriptions.</TableCell></TableRow>
            )}
            {rows.map((s: any) => (
              <TableRow key={s.id} data-state={selected.has(s.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(s.id)}
                    onCheckedChange={(v) => toggleOne(s.id, !!v)}
                    aria-label={`Select ${s.brand_name}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {s.brand_name}
                  {s.cancel_requested_at && (
                    <Badge variant="destructive" className="ml-2">cancel requested</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm">{s.owner.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{s.owner.email ?? "—"}</div>
                </TableCell>
                <TableCell>{s.package?.name ?? "—"}</TableCell>
                <TableCell><StatusBadge s={s.status} /></TableCell>
                <TableCell>
                  <div className="text-sm">{fmtDate(s.expires_at)}</div>
                  {typeof s.days_left === "number" && (
                    <div className={`text-xs ${s.days_left < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {s.days_left < 0 ? `Expired ${-s.days_left}d ago` : `${s.days_left}d left`}
                    </div>
                  )}
                </TableCell>
                <TableCell className="space-x-2 text-right">
                  {s.status === "active" && (
                    <>
                      <Button size="sm" variant="outline"
                        onClick={() => m.mutate({ brand_id: s.id, action: "suspend" })}>
                        Suspend
                      </Button>
                      <Button size="sm" variant="outline"
                        onClick={() => m.mutate({ brand_id: s.id, action: "hold" })}>
                        Hold
                      </Button>
                    </>
                  )}
                  {(s.status === "suspended" || s.status === "on_hold") && (
                    <Button size="sm"
                      onClick={() => m.mutate({ brand_id: s.id, action: "activate" })}>
                      Activate
                    </Button>
                  )}
                  <RenewDialog
                    brandName={s.brand_name}
                    defaultDays={s.package?.duration_days ?? 30}
                    onSubmit={(extend_days) =>
                      m.mutate({ brand_id: s.id, action: "renew", extend_days })
                    }
                  />
                  <ChangePackageDialog
                    brandId={s.id}
                    currentPkgId={s.package?.id ?? null}
                    packages={pkgs.data ?? []}
                    onSubmit={(package_id) => m.mutate({ brand_id: s.id, action: "change_package", package_id })}
                  />
                  {s.pricing_model !== "credits" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="secondary">To credits</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Shift to credit model?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {s.brand_name} will stop using its subscription package and start consuming credits per SMS. A wallet will be created (starting at 0). The customer must top up before sending.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => m.mutate({ brand_id: s.id, action: "convert_to_credits" })}>
                            Shift to credits
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  {s.cancel_requested_at && (
                    <Button size="sm" variant="ghost"
                      onClick={() => m.mutate({ brand_id: s.id, action: "clear_cancel" })}>
                      Dismiss cancel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ChangePackageDialog({
  brandId, currentPkgId, packages, onSubmit, triggerLabel,
}: {
  brandId: string;
  currentPkgId: string | null;
  packages: any[];
  onSubmit: (packageId: string) => void;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pkg, setPkg] = useState<string>(currentPkgId ?? "");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">{triggerLabel ?? "Change"}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change package</DialogTitle>
          <DialogDescription>
            This resets the cycle: new expiry = today + package duration, and limits are reapplied.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Package</Label>
          <Select value={pkg} onValueChange={setPkg}>
            <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
            <SelectContent>
              {packages.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} — {p.price} BDT / {p.duration_days}d
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!pkg} onClick={() => { onSubmit(pkg); setOpen(false); }}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RenewDialog({
  brandName, defaultDays, onSubmit,
}: {
  brandName: string;
  defaultDays: number;
  onSubmit: (days: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<string>(String(defaultDays || 30));
  const n = parseInt(days, 10);
  const valid = Number.isFinite(n) && n >= 1 && n <= 3650;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Renew</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renew {brandName}</DialogTitle>
          <DialogDescription>
            Extends the current expiry (or starts from today if already expired) by the chosen number of days.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Days to extend</Label>
          <Input
            type="number" min={1} max={3650}
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
          <div className="flex flex-wrap gap-2 pt-1">
            {[7, 30, 90, 180, 365].map((d) => (
              <Button key={d} type="button" size="sm" variant="ghost"
                onClick={() => setDays(String(d))}>+{d}d</Button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!valid} onClick={() => { onSubmit(n); setOpen(false); }}>
            Renew
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Customer View ---------------- */


function CustomerView() {
  const qc = useQueryClient();
  const fnList = useServerFn(listMySubscriptions);
  const fnCancel = useServerFn(requestCancelSubscription);
  const q = useQuery({ queryKey: ["subs-mine"], queryFn: () => fnList({ data: undefined as any }) });
  const cancel = useMutation({
    mutationFn: (brand_id: string) => fnCancel({ data: { brand_id } }),
    onSuccess: () => { toast.success("Cancellation requested"); qc.invalidateQueries({ queryKey: ["subs-mine"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (q.isLoading) return <div className="text-muted-foreground">Loading…</div>;
  const list = q.data ?? [];
  if (!list.length) {
    return (
      <Card><CardContent className="p-6 text-sm text-muted-foreground">
        You don't have any subscriptions yet. <Link to="/order" className="text-primary underline">Browse packages</Link>.
      </CardContent></Card>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {list.map((s: any) => (
        <Card key={s.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{s.brand_name}</CardTitle>
              <StatusBadge s={s.status} />
            </div>
            <CardDescription>{s.package?.name ?? "—"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Expires</span><span>{fmtDate(s.expires_at)}</span></div>
            {typeof s.days_left === "number" && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time left</span>
                <span className={s.days_left < 0 ? "text-destructive" : ""}>
                  {s.days_left < 0 ? `Expired ${-s.days_left}d ago` : `${s.days_left}d`}
                </span>
              </div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Devices</span><span>{s.limits.devices}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Messages</span><span>{s.limits.messages ?? "—"}</span></div>
            {s.cancel_requested_at && (
              <div className="rounded bg-muted px-2 py-1 text-xs">
                Cancellation requested on {fmtDate(s.cancel_requested_at)}. Our team will reach out.
              </div>
            )}
            {s.is_owner && (
              <div className="flex flex-wrap gap-2 pt-2">
                <Link to="/order" search={{ upgrade: s.id }} className="flex-1 min-w-[120px]">
                  <Button className="w-full" size="sm">{s.package?.name?.toLowerCase().includes("trial") ? "Upgrade plan" : "Renew / upgrade"}</Button>
                </Link>
                {!s.cancel_requested_at && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1 min-w-[120px]">Request cancel</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Request cancellation?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Your subscription stays active until expiry. Our team will follow up to confirm.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep</AlertDialogCancel>
                        <AlertDialogAction onClick={() => cancel.mutate(s.id)}>
                          Request cancel
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
