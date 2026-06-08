import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Wrench, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { listBrandsLite } from "@/lib/brands.functions";
import { listDevices } from "@/lib/devices.functions";
import { getMyRoles } from "@/lib/users.functions";
import {
  listDeviceRequests,
  createDeviceRequest,
  updateDeviceRequest,
  deleteDeviceRequest,
  getNotifySettings,
  setNotifySettings,
} from "@/lib/device-requests.functions";
import { PageHeader } from "@/components/layout/page-header";

export const Route = createFileRoute("/_authenticated/device-requests")({
  head: () => ({ meta: [{ title: "Device Config Requests — WA Suite" }] }),
  component: DeviceRequestsPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  done: "Done",
  cancelled: "Cancelled",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  in_progress: "bg-sky-100 text-sky-700",
  done: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-200 text-slate-700",
};

function DeviceRequestsPage() {
  const qc = useQueryClient();
  const fnList = useServerFn(listDeviceRequests);
  const fnBrands = useServerFn(listBrandsLite);
  const fnDevices = useServerFn(listDevices);
  const fnCreate = useServerFn(createDeviceRequest);
  const fnUpdate = useServerFn(updateDeviceRequest);
  const fnDelete = useServerFn(deleteDeviceRequest);
  const fnRoles = useServerFn(getMyRoles);
  const fnGetNotify = useServerFn(getNotifySettings);
  const fnSetNotify = useServerFn(setNotifySettings);

  const roles = useQuery({ queryKey: ["my-roles"], queryFn: () => fnRoles() });
  const isOwner = (roles.data ?? []).includes("owner");
  const isStaff = isOwner || (roles.data ?? []).includes("sales_agent");
  const isBrandOwner = (roles.data ?? []).includes("brand_owner");

  const requests = useQuery({ queryKey: ["device-requests"], queryFn: () => fnList() });
  const brands = useQuery({ queryKey: ["brands-lite"], queryFn: () => fnBrands() });
  const devices = useQuery({ queryKey: ["devices"], queryFn: () => fnDevices(), enabled: isOwner });
  const notify = useQuery({ queryKey: ["notify-settings"], queryFn: () => fnGetNotify(), enabled: isOwner });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ brand_id: "", device_name: "", notes: "" });
  const [notifyForm, setNotifyForm] = useState<{ phone: string; device_id: string }>({ phone: "", device_id: "" });
  const [notifyLoaded, setNotifyLoaded] = useState(false);
  if (!notifyLoaded && notify.data) {
    setNotifyForm({
      phone: notify.data.notify_phone ?? "",
      device_id: notify.data.notify_device_id ?? "",
    });
    setNotifyLoaded(true);
  }

  const createMut = useMutation({
    mutationFn: () => fnCreate({ data: { brand_id: form.brand_id, device_name: form.device_name, notes: form.notes || null } }),
    onSuccess: () => {
      toast.success("Request submitted");
      setOpen(false);
      setForm({ brand_id: "", device_name: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["device-requests"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const updateMut = useMutation({
    mutationFn: (p: { id: string; status?: string; admin_reply?: string }) =>
      fnUpdate({ data: p as any }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["device-requests"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["device-requests"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const notifyMut = useMutation({
    mutationFn: () => fnSetNotify({ data: {
      notify_phone: notifyForm.phone.trim() || null,
      notify_device_id: notifyForm.device_id || null,
    } }),
    onSuccess: () => { toast.success("Notification settings saved"); qc.invalidateQueries({ queryKey: ["notify-settings"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <PageHeader
        icon={Wrench}
        title="Device Config Requests"
        description={isStaff ? "Review and assist with device setup requests from brand owners." : "Request device configuration help from our team."}
        actions={
          (isBrandOwner || isOwner) && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> New Request</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Device Config Request</DialogTitle></DialogHeader>
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!form.brand_id || !form.device_name.trim()) {
                      toast.error("Brand and device name are required");
                      return;
                    }
                    createMut.mutate();
                  }}
                >
                  <div className="space-y-1.5">
                    <Label>Brand</Label>
                    <Select value={form.brand_id} onValueChange={(v) => setForm({ ...form, brand_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select a brand" /></SelectTrigger>
                      <SelectContent>
                        {(brands.data ?? []).map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Device Name / Number</Label>
                    <Input
                      value={form.device_name}
                      onChange={(e) => setForm({ ...form, device_name: e.target.value })}
                      placeholder="e.g. Sales WhatsApp +8801XXXXXXXXX"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      rows={4}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Anything our team should know to configure this device."
                    />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createMut.isPending} className="w-full">
                      {createMut.isPending ? "Submitting…" : "Submit Request"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )
        }
      />

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Admin Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              When a brand owner submits a new request, we'll send a WhatsApp alert to this number via the selected device.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Notify WhatsApp Number (E.164, e.g. +8801XXXXXXXXX)</Label>
                <Input
                  value={notifyForm.phone}
                  onChange={(e) => setNotifyForm({ ...notifyForm, phone: e.target.value })}
                  placeholder="+8801XXXXXXXXX"
                />
              </div>
              <div className="space-y-1">
                <Label>Send From Device</Label>
                <Select
                  value={notifyForm.device_id}
                  onValueChange={(v) => setNotifyForm({ ...notifyForm, device_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select a device" /></SelectTrigger>
                  <SelectContent>
                    {(devices.data ?? []).map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} {d.brands?.name ? `(${d.brands.name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => notifyMut.mutate()} disabled={notifyMut.isPending} className="gap-1">
                <Save className="h-4 w-4" /> Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Requests</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes / Reply</TableHead>
                <TableHead>When</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.isLoading && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!requests.isLoading && (requests.data?.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No requests yet.</TableCell></TableRow>
              )}
              {(requests.data ?? []).map((r: any) => (
                <RequestRow
                  key={r.id}
                  r={r}
                  isStaff={isStaff}
                  onStatus={(status) => updateMut.mutate({ id: r.id, status })}
                  onReply={(admin_reply) => updateMut.mutate({ id: r.id, admin_reply })}
                  onDelete={() => delMut.mutate(r.id)}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function RequestRow({
  r, isStaff, onStatus, onReply, onDelete,
}: {
  r: any;
  isStaff: boolean;
  onStatus: (status: string) => void;
  onReply: (reply: string) => void;
  onDelete: () => void;
}) {
  const [reply, setReply] = useState<string>(r.admin_reply ?? "");
  return (
    <TableRow>
      <TableCell className="font-medium">{r.brand_name}</TableCell>
      <TableCell>{r.device_name}</TableCell>
      <TableCell className="text-xs">
        <div>{r.requester_name ?? "—"}</div>
        <div className="text-muted-foreground">{r.requester_email}</div>
      </TableCell>
      <TableCell>
        {isStaff ? (
          <Select value={r.status} onValueChange={onStatus}>
            <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge className={STATUS_COLOR[r.status] ?? ""}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
        )}
      </TableCell>
      <TableCell className="max-w-[260px] space-y-1">
        {r.notes && <div className="text-xs whitespace-pre-wrap"><span className="text-muted-foreground">Notes: </span>{r.notes}</div>}
        {isStaff ? (
          <div className="flex gap-1">
            <Textarea
              rows={2}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Reply to user…"
              className="text-xs"
            />
            <Button size="sm" variant="ghost" onClick={() => onReply(reply)} title="Save reply">
              <Save className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          r.admin_reply && (
            <div className="text-xs whitespace-pre-wrap"><span className="text-muted-foreground">Reply: </span>{r.admin_reply}</div>
          )
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {format(new Date(r.created_at), "MMM d, HH:mm")}
      </TableCell>
      <TableCell className="text-right">
        {isStaff && (
          <Button size="sm" variant="ghost" onClick={onDelete} className="gap-1 text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
