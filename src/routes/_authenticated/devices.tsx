import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Link2, Smartphone, QrCode, BellOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  updateDevice, deleteDevice, testDeviceConnection,
  listWaServers, linkDeviceQR, startDeviceLink, pollDeviceLink,
  refreshDeviceStatuses, applyDeviceDefaults, createDevice,
} from "@/lib/devices.functions";

import { PageHeader } from "@/components/layout/page-header";
import { listBrandsLiteClient, listDevicesClient, listMyRolesClient } from "@/lib/client-queries";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/devices")({
  head: () => ({ meta: [{ title: "Devices — WA Suite" }] }),
  component: DevicesPage,
});

function formatSim(v: string | null | undefined): string {
  if (!v) return "—";
  let digits = v.replace(/\D+/g, "");
  if (!digits) return "—";
  // Strip trailing WhatsApp port suffix (e.g. ...:24).
  // BD MSISDN = 880 + 10 digits = 13. Anything beyond is the port.
  if (digits.startsWith("880") && digits.length > 13) digits = digits.slice(0, 13);
  return "+" + digits;
}



type Device = {
  id: string;
  name: string;
  device_unique_id: string;
  sim_info: string | null;
  brand_id: string | null;
  status: string;
  brands?: { name: string } | null;
};

function DevicesPage() {
  const qc = useQueryClient();
  const fnTest = useServerFn(testDeviceConnection);
  const fnDelete = useServerFn(deleteDevice);
  const fnRefresh = useServerFn(refreshDeviceStatuses);
  const { user } = useAuth();

  const devices = useQuery({ queryKey: ["devices"], queryFn: listDevicesClient });
  const brands = useQuery({ queryKey: ["brands-lite"], queryFn: listBrandsLiteClient });
  const roles = useQuery({ queryKey: ["my-roles", user?.id ?? "anon"], queryFn: () => listMyRolesClient(user?.id), enabled: !!user?.id });
  const isOwner = (roles.data ?? []).includes("owner");
  const isSupport = (roles.data ?? []).includes("support_agent");
  const isBrandOwner = (roles.data ?? []).includes("brand_owner");
  const canManage = isOwner || isSupport || isBrandOwner;

  // Available brands = visible brands that still have device capacity.
  // The backend enforces device_limit per brand regardless of platform role,
  // so don't bypass for owners/support — reflect the same rule in the UI.
  const availableBrands = (brands.data ?? []).filter((b: any) => {
    const limit = Number(b.device_limit ?? 0);
    if (limit <= 0) return true; // 0 = unlimited
    const used = (devices.data ?? []).filter((d: any) => d.brand_id === b.id).length;
    return used < limit;
  });
  const hasCapacity = availableBrands.length > 0;

  const [editing, setEditing] = useState<Device | null>(null);
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState<Device | null>(null);
  const [linking, setLinking] = useState<Device | null>(null);

  const refreshMut = useMutation({
    mutationFn: () => fnRefresh({}),
    onSuccess: (r) => {
      toast.success(`Refreshed ${r.updated} device${r.updated === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  // Auto-refresh statuses once when page mounts.
  useQuery({
    queryKey: ["devices-status-refresh"],
    queryFn: async () => {
      await fnRefresh({});
      qc.invalidateQueries({ queryKey: ["devices"] });
      return true;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const testMut = useMutation({
    mutationFn: (args: { id: string; recipient: string; message?: string }) => fnTest({ data: args }),
    onSuccess: (r) => {
      toast.success(r.status === 200 ? "Sent ✓" : `Status ${r.status}: ${r.message}`);
      qc.invalidateQueries({ queryKey: ["devices"] });
      setTesting(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => {
      toast.success("Device deleted");
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const fnApplyDefaults = useServerFn(applyDeviceDefaults);
  const applyMut = useMutation({
    mutationFn: (id: string) => fnApplyDefaults({ data: { id } }),
    onSuccess: (r) => {
      if (r.ok) toast.success(r.message);
      else toast.warning(r.message);
    },
    onError: (e) => toast.error((e as Error).message),
  });


  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        icon={Smartphone}
        title="Devices"
        description="Connect Android phones to send WhatsApp messages."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => refreshMut.mutate()} disabled={refreshMut.isPending}>
              {refreshMut.isPending ? "Refreshing…" : "Refresh Status"}
            </Button>
            {canManage && (
              <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={!editing && !hasCapacity}
                    title={!hasCapacity ? "Device limit reached for your brand(s). Upgrade your plan to add more." : undefined}
                  >
                    <Plus className="h-4 w-4" /> Add Device
                  </Button>
                </DialogTrigger>
                <DeviceDialog
                  key={editing?.id ?? "new"}
                  editing={editing}
                  brands={editing ? (brands.data ?? []) : availableBrands}
                  isOwner={isOwner}
                  onDone={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["devices"] }); }}
                />
              </Dialog>
            )}
          </div>
        }
      />
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">All Devices</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {isOwner && <TableHead>Device ID</TableHead>}
                <TableHead>SIM</TableHead>
                <TableHead>Linked Brand</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.isLoading && (
                <TableRow><TableCell colSpan={isOwner ? 6 : 5} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!devices.isLoading && (devices.data?.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={isOwner ? 6 : 5} className="py-10 text-center text-sm text-muted-foreground">
                  No devices yet.
                </TableCell></TableRow>
              )}
              {(devices.data ?? []).map((d: any) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.name}</TableCell>
                  {isOwner && <TableCell className="max-w-[280px] truncate font-mono text-xs">{d.device_unique_id}</TableCell>}
                  <TableCell className="text-sm">{formatSim(d.sim_info)}</TableCell>
                  <TableCell>
                    {d.brands?.name ? <Badge variant="secondary">{d.brands.name}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      d.status === "active" ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                      : d.status === "disconnected" ? "bg-rose-100 text-rose-700 hover:bg-rose-100"
                      : "bg-muted text-muted-foreground"
                    }>{d.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setTesting(d as Device)} title="Send test message">
                        <Link2 className="h-3.5 w-3.5" /> Test
                      </Button>
                      {canManage && (
                        <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => setLinking(d as Device)} title="Link with QR code">
                          <QrCode className="h-3.5 w-3.5" /> Link QR
                        </Button>
                      )}
                      {isOwner && (
                        <Button
                          size="sm" variant="outline" className="h-8 gap-1"
                          onClick={() => applyMut.mutate(d.id)}
                          disabled={applyMut.isPending && applyMut.variables === d.id}
                          title="Disable Receive Chats & Random Send on the panel"
                        >
                          <BellOff className="h-3.5 w-3.5" /> Disable Receive
                        </Button>
                      )}

                      {canManage && (
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(d as Device); setOpen(true); }} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canManage && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this device?</AlertDialogTitle>
                              <AlertDialogDescription>This cannot be undone. Campaigns linked to this device may fail.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteMut.mutate(d.id)} className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!testing} onOpenChange={(v) => !v && setTesting(null)}>
        <TestDialog
          device={testing}
          pending={testMut.isPending}
          onSend={(recipient, message) => testing && testMut.mutate({ id: testing.id, recipient, message })}
        />
      </Dialog>

      <Dialog open={!!linking} onOpenChange={(v) => !v && setLinking(null)}>
        {linking && <LinkQrDialog device={linking} />}
      </Dialog>
    </div>
  );
}

function LinkQrDialog({ device }: { device: Device }) {
  const fnServers = useServerFn(listWaServers);
  const fnLink = useServerFn(linkDeviceQR);
  const servers = useQuery({
    queryKey: ["wa-servers", device.id],
    queryFn: () => fnServers({ data: { device_id: device.id } }),
  });
  const [sid, setSid] = useState<string>("");
  const [relink, setRelink] = useState(true);
  const linkMut = useMutation({
    mutationFn: () => fnLink({ data: { device_id: device.id, sid: Number(sid), relink } }),
    onError: (e) => toast.error((e as Error).message),
  });
  const qr = linkMut.data;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Link {device.name}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>WhatsApp Server</Label>
          <Select value={sid} onValueChange={setSid} disabled={servers.isLoading}>
            <SelectTrigger>
              <SelectValue placeholder={servers.isLoading ? "Loading servers…" : "Select a server"} />
            </SelectTrigger>
            <SelectContent>
              {(servers.data ?? []).map((s: any) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name ? `${s.name} (#${s.id})` : `Server #${s.id}`}{s.status ? ` — ${s.status}` : ""}
                </SelectItem>
              ))}
              {(servers.data ?? []).length === 0 && !servers.isLoading && (
                <div className="px-2 py-3 text-center text-xs text-muted-foreground">No servers available</div>
              )}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={relink} onChange={(e) => setRelink(e.target.checked)} />
          Relink existing device (use this device's unique ID)
        </label>
        <Button
          className="w-full"
          disabled={!sid || linkMut.isPending}
          onClick={() => linkMut.mutate()}
        >
          {linkMut.isPending ? "Generating…" : qr ? "Regenerate QR" : "Generate QR"}
        </Button>
        {qr && (
          <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-center">
            <img src={qr.qrimagelink} alt="WhatsApp QR" className="mx-auto h-64 w-64 rounded bg-white p-2" />
            <p className="text-xs text-muted-foreground">
              Open WhatsApp on your phone → Linked Devices → Link a device, then scan this QR.
            </p>
          </div>
        )}
      </div>
    </DialogContent>
  );
}

function TestDialog({ device, pending, onSend }: { device: Device | null; pending: boolean; onSend: (recipient: string, message: string) => void }) {
  const [recipient, setRecipient] = useState("");
  const [message, setMessage] = useState("✅ Test message from WA Suite");
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Test {device?.name ?? "Device"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); onSend(recipient, message); }} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Recipient phone</Label>
          <Input required value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="+8801XXXXXXXXX" />
          <p className="text-[11px] text-muted-foreground">Numbers without + get auto-prefixed with +880.</p>
        </div>
        <div className="space-y-1.5">
          <Label>Message</Label>
          <Input value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={!recipient || pending} className="w-full">
            {pending ? "Sending…" : "Send test message"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function DeviceDialog({
  editing, brands, onDone, isOwner,
}: { editing: Device | null; brands: { id: string; name: string }[]; onDone: () => void; isOwner?: boolean }) {
  const fnUpdate = useServerFn(updateDevice);
  const fnStart = useServerFn(startDeviceLink);
  const fnPoll = useServerFn(pollDeviceLink);
  const fnCreate = useServerFn(createDevice);
  const [mode, setMode] = useState<"qr" | "manual">("qr");
  const [manual, setManual] = useState({ device_unique_id: "", api_secret: "" });

  const [form, setForm] = useState({
    name: editing?.name ?? "",
    sim_info: editing?.sim_info ?? "",
    brand_id: editing?.brand_id ?? "",
  });
  const [brandSearch, setBrandSearch] = useState("");
  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(brandSearch.toLowerCase()),
  );

  const createMut = useMutation({
    mutationFn: () => fnCreate({
      data: {
        name: form.name,
        device_unique_id: manual.device_unique_id,
        api_secret: manual.api_secret,
        sim_info: form.sim_info || null,
        brand_id: form.brand_id || null,
      },
    }),
    onSuccess: () => { toast.success("Device added"); onDone(); },
    onError: (e) => toast.error((e as Error).message),
  });

  // Edit mode → simple update
  const editMut = useMutation({
    mutationFn: () => fnUpdate({
      data: {
        id: editing!.id,
        name: form.name,
        device_unique_id: editing!.device_unique_id,
        sim_info: form.sim_info || null,
        brand_id: form.brand_id || null,
      },
    }),
    onSuccess: () => { toast.success("Device updated"); onDone(); },
    onError: (e) => toast.error((e as Error).message),
  });

  // Add mode → QR linking flow
  const [qr, setQr] = useState<{ qrimagelink: string; infolink: string; api_key_id: string; seen_uniques: string[] } | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [linked, setLinked] = useState(false);

  const startMut = useMutation({
    mutationFn: () => fnStart({ data: { brand_id: form.brand_id || null } }),
    onSuccess: (res) => {
      setQr({
        qrimagelink: res.qrimagelink,
        infolink: res.infolink,
        api_key_id: res.api_key_id,
        seen_uniques: res.seen_uniques ?? [],
      });
      setExpiresAt(new Date(res.expires_at).getTime());
      setLinked(false);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  // Poll the infolink every 2s while QR is active
  const poll = useQuery({
    queryKey: ["device-link-poll", qr?.infolink ?? ""],
    queryFn: () => fnPoll({
      data: {
        api_key_id: qr!.api_key_id,
        infolink: qr!.infolink,
        name: form.name,
        sim_info: form.sim_info || null,
        brand_id: form.brand_id || null,
        seen_uniques: qr!.seen_uniques,
      },
    }),
    enabled: !!qr && !linked && (expiresAt ? Date.now() < expiresAt : true),
    refetchInterval: 2000,
    refetchOnWindowFocus: false,
  });

  if (poll.data?.status === "linked" && !linked) {
    setLinked(true);
    toast.success("Device linked!");
    setTimeout(() => onDone(), 600);
  }

  const expired = !!expiresAt && Date.now() > expiresAt && !linked;

  if (editing) {
    return (
      <DialogContent>
        <DialogHeader><DialogTitle>Edit Device</DialogTitle></DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); editMut.mutate(); }} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Device Name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>SIM Info</Label>
            <Input value={form.sim_info} onChange={(e) => setForm({ ...form, sim_info: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Linked Brand (optional)</Label>
            <Select value={form.brand_id || "none"} onValueChange={(v) => setForm({ ...form, brand_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="No brand" /></SelectTrigger>
              <SelectContent>
                <div className="sticky top-0 z-10 bg-popover p-1.5 border-b">
                  <Input placeholder="Search brands…" value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()} className="h-8" />
                </div>
                <SelectItem value="none">No brand</SelectItem>
                {filteredBrands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={editMut.isPending} className="w-full">
              {editMut.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    );
  }

  // Add mode
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Add Device</DialogTitle></DialogHeader>
      {isOwner && !qr && (
        <div className="flex gap-2 rounded-md border p-1">
          <Button type="button" size="sm" variant={mode === "qr" ? "default" : "ghost"} className="flex-1" onClick={() => setMode("qr")}>QR Link</Button>
          <Button type="button" size="sm" variant={mode === "manual" ? "default" : "ghost"} className="flex-1" onClick={() => setMode("manual")}>Manual</Button>
        </div>
      )}
      {isOwner && mode === "manual" && !qr ? (
        <form onSubmit={(e) => { e.preventDefault(); createMut.mutate(); }} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Device Name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Device" />
          </div>
          <div className="space-y-1.5">
            <Label>Device Unique ID</Label>
            <Input required value={manual.device_unique_id} onChange={(e) => setManual({ ...manual, device_unique_id: e.target.value })} placeholder="WA account unique id" />
          </div>
          <div className="space-y-1.5">
            <Label>API Secret</Label>
            <Input required value={manual.api_secret} onChange={(e) => setManual({ ...manual, api_secret: e.target.value })} placeholder="Panel API secret" />
          </div>
          <div className="space-y-1.5">
            <Label>SIM Info (optional)</Label>
            <Input value={form.sim_info} onChange={(e) => setForm({ ...form, sim_info: e.target.value })} placeholder="+8801XXXXXXXXX" />
          </div>
          <div className="space-y-1.5">
            <Label>Linked Brand (optional)</Label>
            <Select value={form.brand_id || "none"} onValueChange={(v) => setForm({ ...form, brand_id: v === "none" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="No brand" /></SelectTrigger>
              <SelectContent>
                <div className="sticky top-0 z-10 bg-popover p-1.5 border-b">
                  <Input placeholder="Search brands…" value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()} className="h-8" />
                </div>
                <SelectItem value="none">No brand</SelectItem>
                {filteredBrands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createMut.isPending || !form.name || !manual.device_unique_id || !manual.api_secret} className="w-full">
              {createMut.isPending ? "Adding…" : "Add Device"}
            </Button>
          </DialogFooter>
        </form>
      ) : !qr ? (
        <form onSubmit={(e) => { e.preventDefault(); if (form.name && form.brand_id) startMut.mutate(); }} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Device Name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Device" />
          </div>
          <div className="space-y-1.5">
            <Label>SIM Info (optional)</Label>
            <Input value={form.sim_info} onChange={(e) => setForm({ ...form, sim_info: e.target.value })} placeholder="+8801XXXXXXXXX" />
          </div>
          <div className="space-y-1.5">
            <Label>Linked Brand <span className="text-rose-600">*</span></Label>
            <Select value={form.brand_id} onValueChange={(v) => setForm({ ...form, brand_id: v })}>
              <SelectTrigger><SelectValue placeholder="Select a brand" /></SelectTrigger>
              <SelectContent>
                <div className="sticky top-0 z-10 bg-popover p-1.5 border-b">
                  <Input placeholder="Search brands…" value={brandSearch}
                    onChange={(e) => setBrandSearch(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()} className="h-8" />
                </div>
                {filteredBrands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[11px] text-muted-foreground">
            An API key from your pool will be picked at random to generate the QR.
            Manage keys in <span className="font-medium">Settings → API Keys</span>.
          </p>
          <DialogFooter>
            <Button type="submit" disabled={startMut.isPending || !form.name || !form.brand_id} className="w-full">
              {startMut.isPending ? "Generating QR…" : "Generate QR"}
            </Button>
          </DialogFooter>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="rounded-md border bg-muted/30 p-3 text-center">
            <img src={qr.qrimagelink} alt="WhatsApp QR" className="mx-auto h-64 w-64 rounded bg-white p-2" />
            <p className="mt-2 text-xs text-muted-foreground">
              Open WhatsApp → <span className="font-medium">Linked Devices → Link a device</span>, then scan this code.
            </p>
            {linked ? (
              <p className="mt-2 text-sm font-medium text-emerald-600">Linked ✓</p>
            ) : expired ? (
              <p className="mt-2 text-sm font-medium text-rose-600">QR expired</p>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Waiting for scan…</p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={startMut.isPending}
            onClick={() => startMut.mutate()}
          >
            {startMut.isPending ? "Regenerating…" : "Regenerate QR"}
          </Button>
        </div>
      )}
    </DialogContent>
  );
}

