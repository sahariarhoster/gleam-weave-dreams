import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Ban, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { listBlocked, addBlocked, removeBlocked } from "@/lib/logs.functions";
import { listBrandsLite } from "@/lib/brands.functions";

export const Route = createFileRoute("/_authenticated/blocked")({
  head: () => ({ meta: [{ title: "Blocked Numbers — WA Notifier" }] }),
  component: BlockedPage,
});

function BlockedPage() {
  const qc = useQueryClient();
  const fnList = useServerFn(listBlocked);
  const fnBrands = useServerFn(listBrandsLite);
  const fnRemove = useServerFn(removeBlocked);
  const [brand, setBrand] = useState("all");
  const [open, setOpen] = useState(false);

  const brands = useQuery({ queryKey: ["brands-lite"], queryFn: () => fnBrands() });
  const blocked = useQuery({
    queryKey: ["blocked", brand],
    queryFn: () => fnList({ data: { brand_id: brand === "all" ? null : brand } }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => fnRemove({ data: { id } }),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries({ queryKey: ["blocked"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Ban className="h-4 w-4" /> Blocked Numbers
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {(brands.data ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Block Numbers</Button>
              </DialogTrigger>
              <BlockDialog brands={brands.data ?? []} onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["blocked"] }); }} />
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Blocked</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blocked.isLoading && (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!blocked.isLoading && (blocked.data?.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No blocked numbers.</TableCell></TableRow>
              )}
              {(blocked.data ?? []).map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.phone}</TableCell>
                  <TableCell><Badge variant="secondary">{b.brand_name ?? "—"}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{b.reason ?? "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(b.created_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Unblock this number?</AlertDialogTitle>
                          <AlertDialogDescription>Future campaigns can send to it again.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => delMut.mutate(b.id)} className="bg-rose-600 hover:bg-rose-700">Unblock</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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

function BlockDialog({ brands, onDone }: { brands: { id: string; name: string }[]; onDone: () => void }) {
  const fn = useServerFn(addBlocked);
  const [brandId, setBrandId] = useState("");
  const [phones, setPhones] = useState("");
  const [reason, setReason] = useState("");
  const mut = useMutation({
    mutationFn: () => fn({ data: { brand_id: brandId, phones, reason: reason || null } }),
    onSuccess: (r) => { toast.success(`Blocked ${r.inserted} number(s)`); onDone(); setPhones(""); setReason(""); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Block Numbers</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Brand</Label>
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger><SelectValue placeholder="Pick a brand" /></SelectTrigger>
            <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Phone numbers (one per line, or comma-separated)</Label>
          <Textarea rows={6} value={phones} onChange={(e) => setPhones(e.target.value)} placeholder="+8801711000111&#10;+8801711000222" className="font-mono text-xs" />
        </div>
        <div className="space-y-1.5">
          <Label>Reason (optional)</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Unsubscribed, spam complaint…" />
        </div>
      </div>
      <DialogFooter>
        <Button disabled={!brandId || !phones.trim() || mut.isPending} onClick={() => mut.mutate()} className="w-full">
          {mut.isPending ? "Blocking…" : "Block"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
