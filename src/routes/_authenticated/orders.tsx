import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ShoppingBag, Check, X, Loader2, Ban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { listOrders, decideOrder } from "@/lib/orders.functions";

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
      <PageHeader icon={ShoppingBag} title="Orders" description="Review and approve customer orders." />
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
