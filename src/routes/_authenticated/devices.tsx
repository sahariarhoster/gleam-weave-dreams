import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Link2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  createDevice, updateDevice, deleteDevice, testDeviceConnection,
} from "@/lib/devices.functions";
import { PageHeader } from "@/components/layout/page-header";
import { listBrandsLiteClient, listDevicesClient, listMyRolesClient } from "@/lib/client-queries";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/devices")({
  head: () => ({ meta: [{ title: "Devices — WA Suite" }] }),
  component: DevicesPage,
});

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
  const { user } = useAuth();

  const devices = useQuery({ queryKey: ["devices"], queryFn: listDevicesClient });
  const brands = useQuery({ queryKey: ["brands-lite"], queryFn: listBrandsLiteClient });
  const roles = useQuery({ queryKey: ["my-roles", user?.id ?? "anon"], queryFn: () => listMyRolesClient(user?.id), enabled: !!user?.id });
  const isOwner = (roles.data ?? []).includes("owner");
  const isSupport = (roles.data ?? []).includes("support_agent");
  const canManage = isOwner || isSupport;

  const [editing, setEditing] = useState<Device | null>(null);
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState<Device | null>(null);

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

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        icon={Smartphone}
        title="Devices"
        description="Connect Android phones to send WhatsApp messages."
        actions={
          canManage && (
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Device</Button>
              </DialogTrigger>
              <DeviceDialog
                key={editing?.id ?? "new"}
                editing={editing}
                brands={brands.data ?? []}
                onDone={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["devices"] }); }}
              />
            </Dialog>
          )
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
                  <TableCell className="text-sm">{d.sim_info ?? "—"}</TableCell>
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
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(d as Device); setOpen(true); }} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {isOwner && (
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
    </div>
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
  editing, brands, onDone,
}: { editing: Device | null; brands: { id: string; name: string }[]; onDone: () => void }) {
  const fnCreate = useServerFn(createDevice);
  const fnUpdate = useServerFn(updateDevice);
  const [form, setForm] = useState({
    name: editing?.name ?? "",
    device_unique_id: editing?.device_unique_id ?? "",
    sim_info: editing?.sim_info ?? "",
    api_secret: "",
    brand_id: editing?.brand_id ?? "",
  });

  const mut = useMutation({
    mutationFn: async () => {
      
      const base = {
        name: form.name,
        device_unique_id: form.device_unique_id,
        sim_info: form.sim_info || null,
        brand_id: form.brand_id || null,
      };
      if (editing) {
        const data: typeof base & { id: string; api_secret?: string } = { id: editing.id, ...base };
        if (form.api_secret) data.api_secret = form.api_secret;
        return fnUpdate({ data });
      }
      return fnCreate({ data: { ...base, api_secret: form.api_secret } });
    },
    onSuccess: () => { toast.success(editing ? "Device updated" : "Device added"); onDone(); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{editing ? "Edit Device" : "Add Device"}</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => { e.preventDefault(); mut.mutate(); }}
        className="space-y-3"
      >
        <div className="space-y-1.5">
          <Label>Device Name</Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Device" />
        </div>
        <div className="space-y-1.5">
          <Label>Device Unique ID</Label>
          <Input required value={form.device_unique_id} onChange={(e) => setForm({ ...form, device_unique_id: e.target.value })} placeholder="device-123" />
        </div>
        <div className="space-y-1.5">
          <Label>SIM Info</Label>
          <Input value={form.sim_info} onChange={(e) => setForm({ ...form, sim_info: e.target.value })} placeholder="+8801XXXXXXXXX" />
        </div>
        <div className="space-y-1.5">
          <Label>API Secret {editing && <span className="text-xs text-muted-foreground">(re-enter to update)</span>}</Label>
          <Input required={!editing} value={form.api_secret} onChange={(e) => setForm({ ...form, api_secret: e.target.value })} placeholder="secret_key" type="password" />
        </div>
        <div className="space-y-1.5">
          <Label>Linked Brand (optional)</Label>
          <Select value={form.brand_id || "none"} onValueChange={(v) => setForm({ ...form, brand_id: v === "none" ? "" : v })}>
            <SelectTrigger><SelectValue placeholder="No brand" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No brand</SelectItem>
              {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={mut.isPending} className="w-full">
            {mut.isPending ? "Saving…" : editing ? "Save Changes" : "Add Device"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
