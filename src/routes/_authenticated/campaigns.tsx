import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Megaphone, Play, Pause, Eye, Ban } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { listCampaigns, createCampaign, deleteCampaign, setCampaignStatus, runCampaignChunk, cancelCampaign } from "@/lib/campaigns.functions";
import { PageHeader } from "@/components/layout/page-header";
import { listBrandsLiteClient, listCampaignsClient, listDevicesClient, listGroupsClient } from "@/lib/client-queries";

export const Route = createFileRoute("/_authenticated/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns — WA Suite" }] }),
  component: CampaignsPage,
});

function statusColor(s: string) {
  if (s === "running") return "bg-blue-100 text-blue-700 hover:bg-blue-100";
  if (s === "completed") return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
  if (s === "paused") return "bg-amber-100 text-amber-700 hover:bg-amber-100";
  if (s === "failed") return "bg-rose-100 text-rose-700 hover:bg-rose-100";
  if (s === "cancelled") return "bg-slate-200 text-slate-700 hover:bg-slate-200";
  if (s === "scheduled") return "bg-violet-100 text-violet-700 hover:bg-violet-100";
  return "bg-muted text-muted-foreground";
}

function CampaignsPage() {
  const qc = useQueryClient();
  const fnDelete = useServerFn(deleteCampaign);
  const fnStatus = useServerFn(setCampaignStatus);
  const fnRun = useServerFn(runCampaignChunk);

  const camps = useQuery({ queryKey: ["campaigns"], queryFn: listCampaignsClient });
  const [open, setOpen] = useState(false);

  const delMut = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["campaigns"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const runMut = useMutation({
    mutationFn: (id: string) => fnRun({ data: { id, max_messages: 20 } }),
    onSuccess: (r) => {
      if (r.reason === "outside_window") toast.warning("Outside sending window — try again later");
      else if (r.reason === "daily_limit_reached") toast.warning("Daily limit reached");
      else if (r.reason === "no_more_queued") toast.success("Campaign completed");
      else toast.success(`Sent ${r.sent}, failed ${r.failed}${r.paused ? " (auto-paused)" : ""}`);
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const statusMut = useMutation({
    mutationFn: (v: { id: string; status: "running" | "paused" }) => fnStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["campaigns"] }),
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        icon={Megaphone}
        title="Campaigns"
        description="Schedule bulk WhatsApp campaigns with throttling and delivery windows."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> New Campaign</Button></DialogTrigger>
            <NewCampaignDialog onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["campaigns"] }); }} />
          </Dialog>
        }
      />
      <Card className="border-border/60 shadow-sm">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {camps.isLoading && <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!camps.isLoading && (camps.data?.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No campaigns yet.</TableCell></TableRow>
              )}
              {(camps.data ?? []).map((c: any) => {
                const total = c.total_recipients || 1;
                const done = c.sent_count + c.failed_count;
                const pct = Math.round((done / total) * 100);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell><Badge variant="secondary">{c.brands?.name ?? "—"}</Badge></TableCell>
                    <TableCell className="text-sm">{c.devices?.name ?? "—"}</TableCell>
                    <TableCell><Badge className={statusColor(c.status)}>{c.status}</Badge></TableCell>
                    <TableCell className="min-w-[160px]">
                      <div className="space-y-1">
                        <Progress value={pct} className="h-1.5" />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{c.sent_count} sent · {c.failed_count} failed</span>
                          <span>{done}/{c.total_recipients}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.scheduled_at ? format(new Date(c.scheduled_at), "MMM d, HH:mm") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {(c.status === "draft" || c.status === "scheduled" || c.status === "running") && (
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => runMut.mutate(c.id)} disabled={runMut.isPending}>
                            <Play className="h-3.5 w-3.5" /> Send Batch
                          </Button>
                        )}
                        {c.status === "running" && (
                          <Button size="icon" variant="ghost" onClick={() => statusMut.mutate({ id: c.id, status: "paused" })} title="Pause">
                            <Pause className="h-4 w-4" />
                          </Button>
                        )}
                        {c.status === "paused" && (
                          <Button size="icon" variant="ghost" onClick={() => statusMut.mutate({ id: c.id, status: "running" })} title="Resume">
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        <Link to="/logs" search={{ campaign: c.id } as never}>
                          <Button size="icon" variant="ghost" title="View logs"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
                              <AlertDialogDescription>All message rows for this campaign will be removed.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => delMut.mutate(c.id)} className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function NewCampaignDialog({ onDone }: { onDone: () => void }) {
  const fnCreate = useServerFn(createCampaign);

  const brands = useQuery({ queryKey: ["brands-lite"], queryFn: listBrandsLiteClient });
  const devices = useQuery({ queryKey: ["devices"], queryFn: listDevicesClient });

  const PRESETS = {
    direct:       { min: 0,  max: 2 },
    safety_basic: { min: 5,  max: 15 },
    safety_max:   { min: 20, max: 60 },
  } as const;

  const [form, setForm] = useState({
    brand_id: "",
    device_id: "",
    name: "",
    message: "",
    media_url: "",
    scheduled_at: "",
    send_mode: "safety_basic" as "direct" | "safety_basic" | "safety_max",
    min_delay_seconds: 5,
    max_delay_seconds: 15,
    send_window_start: "00:00",
    send_window_end: "23:59",
  });
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

  function pickMode(m: "direct" | "safety_basic" | "safety_max") {
    setForm({ ...form, send_mode: m, min_delay_seconds: PRESETS[m].min, max_delay_seconds: PRESETS[m].max });
  }

  function windowSec(s: string, e: string) {
    const [sh, sm] = s.split(":").map(Number);
    const [eh, em] = e.split(":").map(Number);
    const a = sh * 3600 + sm * 60;
    const b = eh * 3600 + em * 60;
    return Math.max(b >= a ? b - a : 86400 - a + b, 60);
  }
  const avg = Math.max((form.min_delay_seconds + form.max_delay_seconds) / 2, 0.5);
  const estimatedDaily = Math.floor(windowSec(form.send_window_start, form.send_window_end) / avg);

  const groups = useQuery({
    queryKey: ["groups", form.brand_id],
    queryFn: () => listGroupsClient(form.brand_id ? { brand_id: form.brand_id } : {}),
    enabled: !!form.brand_id,
  });

  const mut = useMutation({
    mutationFn: () =>
      fnCreate({
        data: {
          ...form,
          media_url: form.media_url || null,
          scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
          min_delay_seconds: Number(form.min_delay_seconds),
          max_delay_seconds: Number(form.max_delay_seconds),
          group_ids: Array.from(selectedGroups),
        },
      }),
    onSuccess: (r: any) => { toast.success(`Campaign queued with ${r.total_recipients} recipients`); onDone(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const filteredDevices = (devices.data ?? []).filter((d: any) => !form.brand_id || d.brand_id === form.brand_id || !d.brand_id);

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>New Campaign</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Brand</Label>
            <Select value={form.brand_id} onValueChange={(v) => { setForm({ ...form, brand_id: v, device_id: "" }); setSelectedGroups(new Set()); }}>
              <SelectTrigger><SelectValue placeholder="Pick brand" /></SelectTrigger>
              <SelectContent>{(brands.data ?? []).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Device</Label>
            <Select value={form.device_id} onValueChange={(v) => setForm({ ...form, device_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pick device" /></SelectTrigger>
              <SelectContent>{filteredDevices.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5"><Label>Campaign Name</Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Message (use {`{name}`} for personalization)</Label>
          <Textarea required rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </div>
        <div className="space-y-1.5"><Label>Target Groups</Label>
          <div className="max-h-32 overflow-y-auto rounded-md border p-2">
            {!form.brand_id && <p className="text-xs text-muted-foreground">Pick a brand first.</p>}
            {form.brand_id && (groups.data?.length ?? 0) === 0 && <p className="text-xs text-muted-foreground">No groups in this brand.</p>}
            {(groups.data ?? []).map((g: any) => (
              <label key={g.id} className="flex items-center gap-2 py-1 text-sm">
                <Checkbox checked={selectedGroups.has(g.id)} onCheckedChange={() => {
                  const next = new Set(selectedGroups);
                  next.has(g.id) ? next.delete(g.id) : next.add(g.id);
                  setSelectedGroups(next);
                }} />
                {g.name} <span className="text-xs text-muted-foreground">({g.member_count ?? 0})</span>
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-2 rounded-md border p-3">
          <Label>Sending Mode</Label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => pickMode("direct")}
              className={`rounded-md border p-3 text-left text-sm ${form.send_mode === "direct" ? "border-primary bg-primary/5" : "border-border"}`}>
              <div className="font-medium">Direct Mode</div>
              <div className="text-xs text-muted-foreground">Fastest — no delays. Higher ban risk.</div>
            </button>
            <button type="button" onClick={() => pickMode("safety_basic")}
              className={`rounded-md border p-3 text-left text-sm ${form.send_mode !== "direct" ? "border-primary bg-primary/5" : "border-border"}`}>
              <div className="font-medium">Safety Mode</div>
              <div className="text-xs text-muted-foreground">Adds delays to protect your account.</div>
            </button>
          </div>
          {form.send_mode !== "direct" && (
            <>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button type="button" onClick={() => pickMode("safety_basic")}
                  className={`rounded-md border p-2.5 text-left text-xs ${form.send_mode === "safety_basic" ? "border-emerald-500 bg-emerald-50" : "border-border"}`}>
                  <div className="font-medium">Basic Protection</div>
                  <div className="text-muted-foreground">5–15s delay</div>
                </button>
                <button type="button" onClick={() => pickMode("safety_max")}
                  className={`rounded-md border p-2.5 text-left text-xs ${form.send_mode === "safety_max" ? "border-emerald-500 bg-emerald-50" : "border-border"}`}>
                  <div className="font-medium">Max Protection</div>
                  <div className="text-muted-foreground">20–60s delay</div>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="space-y-1"><Label className="text-xs">Min Delay (s)</Label>
                  <Input type="number" min={0} value={form.min_delay_seconds}
                    onChange={(e) => setForm({ ...form, min_delay_seconds: Number(e.target.value) })} />
                </div>
                <div className="space-y-1"><Label className="text-xs">Max Delay (s)</Label>
                  <Input type="number" min={0} value={form.max_delay_seconds}
                    onChange={(e) => setForm({ ...form, max_delay_seconds: Number(e.target.value) })} />
                </div>
                <div className="space-y-1"><Label className="text-xs">Window Start</Label>
                  <Input type="time" value={form.send_window_start}
                    onChange={(e) => setForm({ ...form, send_window_start: e.target.value })} />
                </div>
                <div className="space-y-1"><Label className="text-xs">Window End</Label>
                  <Input type="time" value={form.send_window_end}
                    onChange={(e) => setForm({ ...form, send_window_end: e.target.value })} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                ≈ {estimatedDaily.toLocaleString()} messages/day (auto-calculated from delay × time window)
              </p>
            </>
          )}
        </div>
        <div className="space-y-1.5"><Label>Schedule At (optional)</Label>
          <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={mut.isPending || !form.brand_id || !form.device_id || selectedGroups.size === 0} className="w-full">
            {mut.isPending ? "Creating…" : "Create Campaign"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
