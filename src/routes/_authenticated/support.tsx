import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Wrench, Plus, Trash2, Send } from "lucide-react";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { listBrandsLite } from "@/lib/brands.functions";
import { getMyRoles } from "@/lib/users.functions";
import {
  listSupportTickets,
  createSupportTicket,
  updateSupportTicket,
  deleteSupportTicket,
  listTicketMessages,
  postTicketMessage,
} from "@/lib/support-tickets.functions";
import { PageHeader } from "@/components/layout/page-header";

export const Route = createFileRoute("/_authenticated/support")({
  head: () => ({ meta: [{ title: "Support Tickets — WA Suite" }] }),
  component: SupportTicketsPage,
});

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};
const STATUS_COLOR: Record<string, string> = {
  open: "bg-amber-100 text-amber-700",
  in_progress: "bg-sky-100 text-sky-700",
  resolved: "bg-emerald-100 text-emerald-700",
  closed: "bg-slate-200 text-slate-700",
};
const PRIORITY_LABEL: Record<string, string> = {
  low: "Low", normal: "Normal", high: "High", urgent: "Urgent",
};
const PRIORITY_COLOR: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  normal: "bg-sky-100 text-sky-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function SupportTicketsPage() {
  const qc = useQueryClient();
  const fnList = useServerFn(listSupportTickets);
  const fnBrands = useServerFn(listBrandsLite);
  const fnCreate = useServerFn(createSupportTicket);
  const fnUpdate = useServerFn(updateSupportTicket);
  const fnDelete = useServerFn(deleteSupportTicket);
  const fnRoles = useServerFn(getMyRoles);

  const roles = useQuery({ queryKey: ["my-roles"], queryFn: () => fnRoles() });
  const isStaff = (roles.data ?? []).includes("owner") || (roles.data ?? []).includes("support_agent");

  const tickets = useQuery({ queryKey: ["support-tickets"], queryFn: () => fnList() });
  const brands = useQuery({ queryKey: ["brands-lite"], queryFn: () => fnBrands() });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ brand_id: "", subject: "", description: "", priority: "normal" });
  const [activeId, setActiveId] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () => fnCreate({ data: {
      brand_id: form.brand_id || null,
      subject: form.subject,
      description: form.description || null,
      priority: form.priority as any,
    }}),
    onSuccess: () => {
      toast.success("Ticket submitted");
      setOpen(false);
      setForm({ brand_id: "", subject: "", description: "", priority: "normal" });
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const updateMut = useMutation({
    mutationFn: (p: { id: string; status?: string; priority?: string }) =>
      fnUpdate({ data: p as any }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["support-tickets"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["support-tickets"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <PageHeader
        icon={Wrench}
        title="Support Tickets"
        description={isStaff ? "Manage and respond to support tickets." : "Open a support ticket and our team will get back to you."}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> New Ticket</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New Support Ticket</DialogTitle></DialogHeader>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!form.subject.trim()) { toast.error("Subject is required"); return; }
                  createMut.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <Label>Brand (optional)</Label>
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
                  <Label>Subject</Label>
                  <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    rows={5}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe the issue in detail…"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMut.isPending} className="w-full">
                    {createMut.isPending ? "Submitting…" : "Submit Ticket"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Tickets</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.isLoading && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!tickets.isLoading && (tickets.data?.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No tickets yet.</TableCell></TableRow>
              )}
              {(tickets.data ?? []).map((t: any) => (
                <TableRow key={t.id} className="cursor-pointer" onClick={() => setActiveId(t.id)}>
                  <TableCell className="font-medium">{t.subject}</TableCell>
                  <TableCell>{t.brand_name ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    <div>{t.requester_name ?? "—"}</div>
                    <div className="text-muted-foreground">{t.requester_email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge className={PRIORITY_COLOR[t.priority] ?? ""}>{PRIORITY_LABEL[t.priority] ?? t.priority}</Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {isStaff ? (
                      <Select value={t.status} onValueChange={(v) => updateMut.mutate({ id: t.id, status: v })}>
                        <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_LABEL).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={STATUS_COLOR[t.status] ?? ""}>{STATUS_LABEL[t.status] ?? t.status}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(t.created_at), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="ghost" onClick={() => delMut.mutate(t.id)} className="gap-1 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {activeId && (
        <TicketDrawer
          ticket={(tickets.data ?? []).find((x: any) => x.id === activeId)}
          isStaff={isStaff}
          onClose={() => setActiveId(null)}
        />
      )}
    </div>
  );
}

function TicketDrawer({ ticket, isStaff, onClose }: { ticket: any; isStaff: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const fnMsgs = useServerFn(listTicketMessages);
  const fnPost = useServerFn(postTicketMessage);
  const msgs = useQuery({
    queryKey: ["ticket-msgs", ticket?.id],
    queryFn: () => fnMsgs({ data: { ticket_id: ticket.id } }),
    enabled: !!ticket?.id,
  });
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const postMut = useMutation({
    mutationFn: () => fnPost({ data: { ticket_id: ticket.id, body, is_internal: internal } }),
    onSuccess: () => {
      setBody("");
      qc.invalidateQueries({ queryKey: ["ticket-msgs", ticket.id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!ticket) return null;
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>{ticket.subject}</SheetTitle>
        </SheetHeader>
        <div className="text-xs text-muted-foreground">
          {ticket.brand_name && <>Brand: {ticket.brand_name} · </>}
          {ticket.requester_name ?? ticket.requester_email}
        </div>
        {ticket.description && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm whitespace-pre-wrap">{ticket.description}</div>
        )}
        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {(msgs.data ?? []).map((m: any) => (
            <div key={m.id} className={`rounded-md border p-2 text-sm ${m.is_internal ? "bg-amber-50 border-amber-200" : "bg-card"}`}>
              <div className="text-xs text-muted-foreground flex justify-between">
                <span>{m.sender_name}{m.is_internal ? " · internal" : ""}</span>
                <span>{format(new Date(m.created_at), "MMM d, HH:mm")}</span>
              </div>
              <div className="whitespace-pre-wrap">{m.body}</div>
            </div>
          ))}
          {!msgs.isLoading && (msgs.data?.length ?? 0) === 0 && (
            <div className="text-center text-xs text-muted-foreground py-6">No messages yet.</div>
          )}
        </div>
        <div className="space-y-2 border-t pt-2">
          <Textarea
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a reply…"
          />
          <div className="flex items-center justify-between">
            {isStaff ? (
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                Internal note (staff only)
              </label>
            ) : <div />}
            <Button
              size="sm"
              className="gap-1"
              disabled={!body.trim() || postMut.isPending}
              onClick={() => postMut.mutate()}
            >
              <Send className="h-3.5 w-3.5" /> Send
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
