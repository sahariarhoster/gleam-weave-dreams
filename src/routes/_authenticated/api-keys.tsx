import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/layout/page-header";
import {
  listApiKeys, createApiKey, updateApiKey, deleteApiKey,
} from "@/lib/devices.functions";

export const Route = createFileRoute("/_authenticated/api-keys")({
  head: () => ({ meta: [{ title: "API Keys — WA Suite" }] }),
  component: ApiKeysPage,
});

function mask(s: string) {
  if (!s) return "";
  if (s.length <= 8) return "•".repeat(s.length);
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function ApiKeysPage() {
  const qc = useQueryClient();
  const fnList = useServerFn(listApiKeys);
  const fnUpdate = useServerFn(updateApiKey);
  const fnDelete = useServerFn(deleteApiKey);

  const keys = useQuery({ queryKey: ["wa-api-keys"], queryFn: () => fnList() });
  const [open, setOpen] = useState(false);

  const toggleMut = useMutation({
    mutationFn: (args: { id: string; active: boolean }) =>
      fnUpdate({ data: args }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wa-api-keys"] }),
    onError: (e) => toast.error((e as Error).message),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => {
      toast.success("API key removed");
      qc.invalidateQueries({ queryKey: ["wa-api-keys"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        icon={KeyRound}
        title="API Keys"
        description="Pool of WA Suite API secrets. One is picked at random whenever a new device is being linked."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Key</Button>
            </DialogTrigger>
            <AddKeyDialog onDone={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["wa-api-keys"] }); }} />
          </Dialog>
        }
      />
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">All Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Secret</TableHead>
                <TableHead>Server ID</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.isLoading && (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!keys.isLoading && (keys.data?.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  No API keys yet. Add at least one before linking a device.
                </TableCell></TableRow>
              )}
              {(keys.data ?? []).map((k: any) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.label}</TableCell>
                  <TableCell className="font-mono text-xs">{mask(k.secret)}</TableCell>
                  <TableCell><Badge variant="secondary">#{k.sid}</Badge></TableCell>
                  <TableCell>
                    <Switch
                      checked={!!k.active}
                      onCheckedChange={(v) => toggleMut.mutate({ id: k.id, active: v })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this API key?</AlertDialogTitle>
                          <AlertDialogDescription>Existing devices already linked with it keep working — but new links won't pick it.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => delMut.mutate(k.id)} className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
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

function AddKeyDialog({ onDone }: { onDone: () => void }) {
  const fnCreate = useServerFn(createApiKey);
  const [form, setForm] = useState({ label: "", secret: "", sid: 1, active: true });
  const mut = useMutation({
    mutationFn: () => fnCreate({ data: form }),
    onSuccess: () => { toast.success("API key added"); onDone(); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add API Key</DialogTitle>
      </DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
        <div className="space-y-1.5">
          <Label>Label</Label>
          <Input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Server 1 — key A" />
        </div>
        <div className="space-y-1.5">
          <Label>API Secret</Label>
          <Input required type="password" value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} placeholder="secret from Tools → API Keys" />
        </div>
        <div className="space-y-1.5">
          <Label>WhatsApp Server ID (sid)</Label>
          <Input required type="number" min={1} value={form.sid} onChange={(e) => setForm({ ...form, sid: Number(e.target.value) || 1 })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
          Active (eligible for random pick)
        </label>
        <DialogFooter>
          <Button type="submit" disabled={mut.isPending} className="w-full">
            {mut.isPending ? "Saving…" : "Add Key"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
