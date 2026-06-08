import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Contact, Upload } from "lucide-react";
import { toast } from "sonner";
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
import { listContacts, createContact, updateContact, deleteContact, importContacts } from "@/lib/contacts.functions";
import { listBrandsLite } from "@/lib/brands.functions";
import { PageHeader } from "@/components/layout/page-header";

export const Route = createFileRoute("/_authenticated/contacts")({
  head: () => ({ meta: [{ title: "Contacts — WA Suite" }] }),
  component: ContactsPage,
});

type Contact = {
  id: string; brand_id: string; name: string | null; phone: string;
  email: string | null; tags: string[] | null; notes: string | null;
  brands?: { name: string } | null;
};

function ContactsPage() {
  const qc = useQueryClient();
  const fnList = useServerFn(listContacts);
  const fnBrands = useServerFn(listBrandsLite);
  const fnDelete = useServerFn(deleteContact);

  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Contact | null>(null);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const brands = useQuery({ queryKey: ["brands-lite"], queryFn: () => fnBrands() });
  const contacts = useQuery({
    queryKey: ["contacts", brandFilter],
    queryFn: () => fnList({ data: brandFilter === "all" ? {} : { brand_id: brandFilter } }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["contacts"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        icon={Contact}
        title="Contacts"
        description="Your address book of phone numbers, grouped per brand."
        actions={
          <>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {(brands.data ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={importOpen} onOpenChange={setImportOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline" className="gap-1"><Upload className="h-4 w-4" /> Import</Button></DialogTrigger>
              <ImportDialog brands={brands.data ?? []} onDone={() => { setImportOpen(false); qc.invalidateQueries({ queryKey: ["contacts"] }); }} />
            </Dialog>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
              <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Contact</Button></DialogTrigger>
              <ContactDialog editing={editing} brands={brands.data ?? []} onDone={() => { setOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["contacts"] }); }} />
            </Dialog>
          </>
        }
      />
      <Card className="border-border/60 shadow-sm">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.isLoading && <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!contacts.isLoading && (contacts.data?.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No contacts. Add or import some.</TableCell></TableRow>
              )}
              {(contacts.data ?? []).map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{c.phone}</TableCell>
                  <TableCell className="text-sm">{c.email ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{c.brands?.name ?? "—"}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(c.tags ?? []).map((t: string) => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete contact?</AlertDialogTitle>
                            <AlertDialogDescription>This will remove it from all groups.</AlertDialogDescription>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ContactDialog({ editing, brands, onDone }: { editing: Contact | null; brands: { id: string; name: string }[]; onDone: () => void }) {
  const fnCreate = useServerFn(createContact);
  const fnUpdate = useServerFn(updateContact);
  const [form, setForm] = useState({
    brand_id: editing?.brand_id ?? "",
    name: editing?.name ?? "",
    phone: editing?.phone ?? "",
    email: editing?.email ?? "",
    tags: (editing?.tags ?? []).join(", "),
    notes: editing?.notes ?? "",
  });
  const mut = useMutation({
    mutationFn: async () => {
      const payload = {
        brand_id: form.brand_id,
        name: form.name || null,
        phone: form.phone,
        email: form.email || null,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        notes: form.notes || null,
      };
      if (editing) return fnUpdate({ data: { id: editing.id, ...payload } });
      return fnCreate({ data: payload });
    },
    onSuccess: () => { toast.success(editing ? "Updated" : "Added"); onDone(); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>{editing ? "Edit Contact" : "Add Contact"}</DialogTitle></DialogHeader>
      <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-3">
        <div className="space-y-1.5"><Label>Brand</Label>
          <Select value={form.brand_id} onValueChange={(v) => setForm({ ...form, brand_id: v })}>
            <SelectTrigger><SelectValue placeholder="Pick a brand" /></SelectTrigger>
            <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5"><Label>Phone</Label>
            <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+8801..." />
          </div>
        </div>
        <div className="space-y-1.5"><Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="space-y-1.5"><Label>Tags (comma-separated)</Label>
          <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="vip, dhaka" />
        </div>
        <div className="space-y-1.5"><Label>Notes</Label>
          <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <DialogFooter>
          <Button type="submit" disabled={!form.brand_id || mut.isPending} className="w-full">
            {mut.isPending ? "Saving…" : editing ? "Save Changes" : "Add Contact"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ImportDialog({ brands, onDone }: { brands: { id: string; name: string }[]; onDone: () => void }) {
  const fn = useServerFn(importContacts);
  const [brandId, setBrandId] = useState("");
  const [text, setText] = useState("");
  const mut = useMutation({
    mutationFn: async () => {
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      const rows = lines.map((line) => {
        const [phone, name, email] = line.split(",").map((s) => s?.trim());
        return { phone, name: name || undefined, email: email || undefined };
      }).filter((r) => r.phone);
      if (rows.length === 0) throw new Error("Add at least one row");
      return fn({ data: { brand_id: brandId, rows } });
    },
    onSuccess: (r) => { toast.success(`Imported ${r.inserted} / ${r.total}`); onDone(); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Import Contacts</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Brand</Label>
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger><SelectValue placeholder="Pick a brand" /></SelectTrigger>
            <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Paste rows (phone, name, email — one per line)</Label>
          <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder="+8801711000111, Karim, karim@example.com" className="font-mono text-xs" />
          <p className="text-xs text-muted-foreground">Existing phones are skipped.</p>
        </div>
      </div>
      <DialogFooter>
        <Button disabled={!brandId || !text.trim() || mut.isPending} onClick={() => mut.mutate()} className="w-full">
          {mut.isPending ? "Importing…" : "Import"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
