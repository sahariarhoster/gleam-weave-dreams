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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">All Subscriptions</CardTitle>
          <CardDescription>Suspend, activate, renew, or change package.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.isLoading && <TableRow><TableCell colSpan={6}>Loading…</TableCell></TableRow>}
            {!q.isLoading && rows.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-muted-foreground">No subscriptions.</TableCell></TableRow>
            )}
            {rows.map((s: any) => (
              <TableRow key={s.id}>
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
  brandId, currentPkgId, packages, onSubmit,
}: {
  brandId: string;
  currentPkgId: string | null;
  packages: any[];
  onSubmit: (packageId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pkg, setPkg] = useState<string>(currentPkgId ?? "");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Change</Button>
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
              <div className="flex gap-2 pt-2">
                <Link to="/order" className="flex-1">
                  <Button className="w-full" size="sm">Renew</Button>
                </Link>
                {!s.cancel_requested_at && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">Request cancel</Button>
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
