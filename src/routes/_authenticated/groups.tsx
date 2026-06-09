import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, FolderOpen, Users2 } from "lucide-react";
import { toast } from "sonner";
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
import { createGroup, updateGroup, deleteGroup, setGroupMembers } from "@/lib/contacts.functions";
import { PageHeader } from "@/components/layout/page-header";
import { getGroupMembersClient, listBrandsLiteClient, listContactsClient, listGroupsClient } from "@/lib/client-queries";

export const Route = createFileRoute("/_authenticated/groups")({
  head: () => ({ meta: [{ title: "Groups — WA Suite" }] }),
  component: GroupsPage,
});

type Group = { id: string; brand_id: string; name: string; description: string | null; member_count?: number; brands?: { name: string } | null };

function GroupsPage() {
  const qc = useQueryClient();
  const fnDelete = useServerFn(deleteGroup);
  const groups = useQuery({ queryKey: ["groups"], queryFn: () => listGroupsClient({}) });
  const brands = useQuery({ queryKey: ["brands-lite"], queryFn: listBrandsLiteClient });

  const [editing, setEditing] = useState<Group | null>(null);
  const [open, setOpen] = useState(false);
  const [manage, setManage] = useState<Group | null>(null);

  const delMut = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["groups"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        icon={FolderOpen}
        title="Contact Groups"
        description="Bundle contacts into reusable groups for targeted campaigns."
        actions={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Group</Button></DialogTrigger>
            <GroupDialog editing={editing} brands={brands.data ?? []} onDone={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["groups"] }); }} />
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
                <TableHead>Description</TableHead>
                <TableHead>Members</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.isLoading && <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!groups.isLoading && (groups.data?.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No groups yet.</TableCell></TableRow>
              )}
              {(groups.data ?? []).map((g: any) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell><Badge variant="secondary">{g.brands?.name ?? "—"}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{g.description ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline">{g.member_count ?? 0}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setManage(g)}>
                        <Users2 className="h-4 w-4" /> Members
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(g); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete group?</AlertDialogTitle>
                            <AlertDialogDescription>Contacts will not be deleted.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => delMut.mutate(g.id)} className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!manage} onOpenChange={(v) => !v && setManage(null)}>
        {manage && <MembersDialog group={manage} onDone={() => { setManage(null); qc.invalidateQueries({ queryKey: ["groups"] }); }} />}
      </Dialog>
    </div>
  );
}

function GroupDialog({ editing, brands, onDone }: { editing: Group | null; brands: { id: string; name: string }[]; onDone: () => void }) {
  const fnCreate = useServerFn(createGroup);
  const fnUpdate = useServerFn(updateGroup);
  const [form, setForm] = useState({
    brand_id: editing?.brand_id ?? "",
    name: editing?.name ?? "",
    description: editing?.description ?? "",
  });
  const mut = useMutation({
    mutationFn: async () => {
      const payload = { brand_id: form.brand_id, name: form.name, description: form.description || null };
      if (editing) return fnUpdate({ data: { id: editing.id, ...payload } });
      return fnCreate({ data: payload });
    },
    onSuccess: () => { toast.success(editing ? "Updated" : "Created"); onDone(); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "Edit Group" : "Add Group"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
        <div className="space-y-1.5"><Label>Brand</Label>
          <Select value={form.brand_id} onValueChange={(v) => setForm({ ...form, brand_id: v })}>
            <SelectTrigger><SelectValue placeholder="Pick a brand" /></SelectTrigger>
            <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Group Name</Label>
          <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5"><Label>Description</Label>
          <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={!form.brand_id || mut.isPending} className="w-full">
            {mut.isPending ? "Saving…" : editing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function MembersDialog({ group, onDone }: { group: Group; onDone: () => void }) {
  const fnSet = useServerFn(setGroupMembers);

  const contacts = useQuery({
    queryKey: ["contacts", group.brand_id],
    queryFn: () => listContactsClient({ brand_id: group.brand_id }),
  });
  const members = useQuery({
    queryKey: ["group-members", group.id],
    queryFn: () => getGroupMembersClient(group.id),
  });

  const [selected, setSelected] = useState<Set<string> | null>(null);
  const current = selected ?? new Set<string>((members.data ?? []).map((m: any) => m.id));

  const toggle = (id: string) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const mut = useMutation({
    mutationFn: () => fnSet({ data: { group_id: group.id, contact_ids: Array.from(current) } }),
    onSuccess: (r) => { toast.success(`${r.count} member(s) saved`); onDone(); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>Manage members — {group.name}</DialogTitle></DialogHeader>
      <div className="max-h-[400px] overflow-y-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(contacts.isLoading || members.isLoading) && <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
            {(contacts.data ?? []).map((c: any) => (
              <TableRow key={c.id}>
                <TableCell><Checkbox checked={current.has(c.id)} onCheckedChange={() => toggle(c.id)} /></TableCell>
                <TableCell>{c.name ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">{c.phone}</TableCell>
              </TableRow>
            ))}
            {!contacts.isLoading && (contacts.data?.length ?? 0) === 0 && (
              <TableRow><TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">No contacts in this brand.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DialogFooter>
        <div className="flex w-full items-center justify-between">
          <span className="text-sm text-muted-foreground">{current.size} selected</span>
          <Button disabled={mut.isPending} onClick={() => mut.mutate()}>{mut.isPending ? "Saving…" : "Save Members"}</Button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}
