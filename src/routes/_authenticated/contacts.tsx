import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Contact, Upload, Sparkles, FolderPlus, Chrome } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  createContact,
  updateContact,
  deleteContact,
  importContacts,
  bulkDeleteContacts,
  addContactsToGroup,
  importDeliveredNumbers,
} from "@/lib/contacts.functions";
import { PageHeader } from "@/components/layout/page-header";
import { listBrandsLiteClient, listContactsClient, listGroupsClient } from "@/lib/client-queries";

export const Route = createFileRoute("/_authenticated/contacts")({
  head: () => ({ meta: [{ title: "Contacts — WA Suite" }] }),
  component: ContactsPage,
});

type Contact = {
  id: string; brand_id: string; name: string | null; phone: string;
  email: string | null; tags: string[] | null; notes: string | null;
  brands?: { name: string } | null;
};

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function ContactsPage() {
  const qc = useQueryClient();
  const fnDelete = useServerFn(deleteContact);
  const fnBulkDelete = useServerFn(bulkDeleteContacts);

  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Contact | null>(null);
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deliveredOpen, setDeliveredOpen] = useState(false);
  const [addToGroupOpen, setAddToGroupOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const brands = useQuery({ queryKey: ["brands-lite"], queryFn: listBrandsLiteClient });
  const contacts = useQuery({
    queryKey: ["contacts", brandFilter],
    queryFn: () => listContactsClient(brandFilter === "all" ? {} : { brand_id: brandFilter }),
  });

  const rows: Contact[] = contacts.data ?? [];
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const allChecked = rows.length > 0 && rows.every((r) => selected[r.id]);

  const delMut = useMutation({
    mutationFn: (id: string) => fnDelete({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["contacts"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const bulkDelMut = useMutation({
    mutationFn: () => fnBulkDelete({ data: { ids: selectedIds } }),
    onSuccess: (r) => {
      toast.success(`Deleted ${r.count} contacts`);
      setSelected({});
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
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
            <Select value={brandFilter} onValueChange={(v) => { setBrandFilter(v); setSelected({}); }}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {(brands.data ?? []).map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={deliveredOpen} onOpenChange={setDeliveredOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1"><Sparkles className="h-4 w-4" /> Import Delivered</Button>
              </DialogTrigger>
              <DeliveredDialog
                brands={brands.data ?? []}
                onDone={() => { setDeliveredOpen(false); qc.invalidateQueries({ queryKey: ["contacts"] }); qc.invalidateQueries({ queryKey: ["groups"] }); }}
              />
            </Dialog>
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={async () => {
                try {
                  const res = await fetch("/wa-suite-exporter.zip");
                  if (!res.ok) throw new Error("Download failed");
                  const blob = await res.blob();
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = "wa-suite-exporter.zip";
                  a.click();
                  URL.revokeObjectURL(a.href);
                  toast.success("Extension downloaded. Unzip & load it via chrome://extensions (Developer mode → Load unpacked).");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              <Chrome className="h-4 w-4" /> WhatsApp Extension
            </Button>
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

      {selectedIds.length > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm">
          <div><strong>{selectedIds.length}</strong> selected</div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => setAddToGroupOpen(true)}>
              <FolderPlus className="h-4 w-4" /> Add to group
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="destructive" className="gap-1"><Trash2 className="h-4 w-4" /> Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selectedIds.length} contacts?</AlertDialogTitle>
                  <AlertDialogDescription>This will remove them from all groups.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => bulkDelMut.mutate()} className="bg-rose-600 hover:bg-rose-700">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button size="sm" variant="ghost" onClick={() => setSelected({})}>Clear</Button>
          </div>
        </div>
      )}

      <Dialog open={addToGroupOpen} onOpenChange={setAddToGroupOpen}>
        <AddToGroupDialog
          contactIds={selectedIds}
          brandFilter={brandFilter}
          brands={brands.data ?? []}
          onDone={() => { setAddToGroupOpen(false); setSelected({}); qc.invalidateQueries({ queryKey: ["groups"] }); }}
        />
      </Dialog>

      <Card className="border-border/60 shadow-sm">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox
                    checked={allChecked}
                    onCheckedChange={(v) => {
                      if (v) setSelected(Object.fromEntries(rows.map((r) => [r.id, true])));
                      else setSelected({});
                    }}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.isLoading && <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>}
              {!contacts.isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No contacts. Add or import some.</TableCell></TableRow>
              )}
              {rows.map((c: any) => (
                <TableRow key={c.id} data-state={selected[c.id] ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={!!selected[c.id]}
                      onCheckedChange={(v) => setSelected((s) => ({ ...s, [c.id]: !!v }))}
                    />
                  </TableCell>
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
  const [fileName, setFileName] = useState("");
  const [existingGroupId, setExistingGroupId] = useState<string>("none");
  const [groupName, setGroupName] = useState("");

  const groups = useQuery({
    queryKey: ["groups", brandId],
    queryFn: () => listGroupsClient(brandId ? { brand_id: brandId } : {}),
    enabled: !!brandId,
  });

  const parseRows = (raw: string) => {
    const split = (line: string) =>
      line.split(/[,\t;]/).map((s) => s?.trim().replace(/^"|"$/g, "") ?? "");
    const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [] as { phone: string; name?: string; email?: string }[];

    // Detect header and column order
    const firstCells = split(lines[0]).map((c) => c.toLowerCase());
    const looksLikeHeader = firstCells.some((c) => ["phone", "name", "email", "number", "mobile"].includes(c));
    let phoneIdx = 0, nameIdx = 1, emailIdx = 2, startIdx = 0;
    if (looksLikeHeader) {
      startIdx = 1;
      const find = (keys: string[]) => firstCells.findIndex((c) => keys.includes(c));
      const p = find(["phone", "number", "mobile", "msisdn"]);
      const n = find(["name", "contact", "full name", "fullname"]);
      const e = find(["email", "mail", "e-mail"]);
      if (p >= 0) phoneIdx = p;
      if (n >= 0) nameIdx = n;
      if (e >= 0) emailIdx = e;
    }
    return lines.slice(startIdx).map((line) => {
      const cells = split(line);
      let phone = cells[phoneIdx] ?? "";
      let name = cells[nameIdx] ?? "";
      const email = cells[emailIdx] ?? "";
      // Fallback: if expected phone cell isn't a phone but another cell is, swap
      const isPhone = (v: string) => /^\+?[\d\s\-()]{5,}$/.test(v) && /\d{5,}/.test(v);
      if (!isPhone(phone)) {
        const alt = cells.find((c) => isPhone(c));
        if (alt) {
          if (isPhone(phone) === false && phone && !name) name = phone;
          phone = alt;
        }
      }
      return { phone, name: name || undefined, email: email || undefined };
    }).filter((r) => r && r.phone);
  };


  const onFile = async (file: File) => {
    setFileName(file.name);
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext === "csv" || ext === "txt" || ext === "tsv") {
      setText(await file.text());
      return;
    }
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    setText(XLSX.utils.sheet_to_csv(ws));
  };

  const downloadSample = () => {
    const sample = "phone,name,email\n+8801711000111,Karim,karim@example.com\n+8801822000222,Rahim,\n+8801933000333,,sumi@example.com\n";
    const blob = new Blob([sample], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "contacts-sample.csv";
    a.click(); URL.revokeObjectURL(url);
  };

  const parsed = useMemo(() => {
    const rows = parseRows(text);
    const phoneRe = /^\+?\d{5,15}$/;
    const seen = new Set<string>();
    let valid = 0, invalid = 0, duplicates = 0;
    const cleanRows: { phone: string; name?: string; email?: string }[] = [];
    for (const r of rows) {
      const phone = (r.phone || "").replace(/[^\d+]/g, "");
      if (!phoneRe.test(phone)) { invalid++; continue; }
      if (seen.has(phone)) { duplicates++; continue; }
      seen.add(phone);
      valid++;
      cleanRows.push({ phone, name: r.name, email: r.email });
    }
    return { total: rows.length, valid, invalid, duplicates, cleanRows };
  }, [text]);

  const [confirming, setConfirming] = useState(false);

  const mut = useMutation({
    mutationFn: async () => {
      if (parsed.cleanRows.length === 0) throw new Error("No valid rows to import");
      return fn({
        data: {
          brand_id: brandId,
          rows: parsed.cleanRows,
          existing_group_id: existingGroupId !== "none" ? existingGroupId : null,
          group_name: groupName.trim() || null,
        },
      });
    },
    onSuccess: (r: any) => {
      const groupNote = r.group_ids?.length
        ? ` · added to ${r.group_ids.length} group(s)`
        : "";
      toast.success(`Imported ${r.inserted} new contact(s) out of ${parsed.valid} valid (${r.skipped ?? 0} skipped)${groupNote}`);
      setConfirming(false);
      onDone();
    },
    onError: (e) => { toast.error((e as Error).message); setConfirming(false); },
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Import Contacts</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Brand</Label>
          <Select value={brandId} onValueChange={(v) => { setBrandId(v); setExistingGroupId("none"); }}>
            <SelectTrigger><SelectValue placeholder="Pick a brand" /></SelectTrigger>
            <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label>Upload file (CSV, XLSX, XLS, TSV, TXT)</Label>
            <Button type="button" size="sm" variant="ghost" onClick={downloadSample}>Download sample</Button>
          </div>
          <Input
            type="file"
            accept=".csv,.tsv,.txt,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
          />
          {fileName && <p className="text-xs text-muted-foreground">Loaded: {fileName}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Or paste rows (phone, name, email)</Label>
          <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="+8801711000111, Karim, karim@example.com" className="font-mono text-xs" />
          <p className="text-xs text-muted-foreground">First column must be the phone. Header row optional. Existing phones are skipped.</p>
        </div>
        <div className="space-y-1.5">
          <Label>Add to an existing group (optional)</Label>
          <Select value={existingGroupId} onValueChange={setExistingGroupId} disabled={!brandId}>
            <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {(groups.data ?? []).map((g: any) => (
                <SelectItem key={g.id} value={g.id}>{g.name} ({g.member_count})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>And/or create a new group (optional)</Label>
          <Input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Imported Leads"
          />
          <p className="text-xs text-muted-foreground">Leave blank to skip creating a new group.</p>
        </div>
        {parsed.total > 0 && (
          <div className="rounded-md border border-border/60 bg-muted/40 p-3 text-sm">
            <div className="font-medium mb-1">Preview</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>Parsed rows: <strong>{parsed.total}</strong></div>
              <div>Ready to import: <strong className="text-emerald-600">{parsed.valid}</strong></div>
              <div>Invalid phones: <strong className="text-rose-600">{parsed.invalid}</strong></div>
              <div>Duplicates in file: <strong>{parsed.duplicates}</strong></div>
            </div>
          </div>
        )}
      </div>
      <DialogFooter>
        {!confirming ? (
          <Button
            disabled={!brandId || parsed.valid === 0}
            onClick={() => setConfirming(true)}
            className="w-full"
          >
            Check & Continue {parsed.valid > 0 ? `(${parsed.valid})` : ""}
          </Button>
        ) : (
          <div className="flex w-full gap-2">
            <Button variant="outline" className="flex-1" disabled={mut.isPending} onClick={() => setConfirming(false)}>
              Back
            </Button>
            <Button className="flex-1" disabled={mut.isPending} onClick={() => mut.mutate()}>
              {mut.isPending ? "Importing…" : `Yes, import ${parsed.valid}`}
            </Button>
          </div>
        )}
      </DialogFooter>
    </DialogContent>
  );
}

function DeliveredDialog({ brands, onDone }: { brands: { id: string; name: string }[]; onDone: () => void }) {
  const fn = useServerFn(importDeliveredNumbers);
  const [brandId, setBrandId] = useState("");
  const [start, setStart] = useState(todayStr());
  const [end, setEnd] = useState(todayStr());
  const [groupName, setGroupName] = useState("");
  const [existingGroupId, setExistingGroupId] = useState<string>("none");

  const groups = useQuery({
    queryKey: ["groups", brandId],
    queryFn: () => listGroupsClient(brandId ? { brand_id: brandId } : {}),
    enabled: !!brandId,
  });

  const mut = useMutation({
    mutationFn: () =>
      fn({
        data: {
          brand_id: brandId,
          start,
          end,
          group_name: groupName.trim() || null,
          existing_group_id: existingGroupId !== "none" ? existingGroupId : null,
        },
      }),
    onSuccess: (r) => {
      toast.success(`Found ${r.found} delivered numbers · added to ${r.group_ids?.length ?? 0} group(s)`);
      onDone();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const setQuick = (kind: "today" | "yesterday" | "7d" | "30d") => {
    const now = new Date();
    const t = todayStr();
    if (kind === "today") { setStart(t); setEnd(t); }
    else if (kind === "yesterday") {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      setStart(yStr); setEnd(yStr);
    } else if (kind === "7d") {
      const s = new Date(now); s.setDate(s.getDate() - 6);
      setStart(s.toISOString().slice(0, 10)); setEnd(t);
    } else {
      const s = new Date(now); s.setDate(s.getDate() - 29);
      setStart(s.toISOString().slice(0, 10)); setEnd(t);
    }
  };

  const nothingPicked = existingGroupId === "none" && !groupName.trim();

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Import Delivered Numbers</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Pull every phone number you successfully delivered to in a date range and
          <strong> add</strong> them to one or both groups below. Numbers already in
          other groups stay where they are — nothing is removed.
        </p>
        <div className="space-y-1.5">
          <Label>Brand</Label>
          <Select value={brandId} onValueChange={(v) => { setBrandId(v); setExistingGroupId("none"); }}>
            <SelectTrigger><SelectValue placeholder="Pick a brand" /></SelectTrigger>
            <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5"><Label>From</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1.5"><Label>To</Label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" size="sm" variant="outline" onClick={() => setQuick("today")}>Today</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setQuick("yesterday")}>Yesterday</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setQuick("7d")}>Last 7 days</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setQuick("30d")}>Last 30 days</Button>
        </div>
        <div className="space-y-1.5">
          <Label>Add to an existing group</Label>
          <Select value={existingGroupId} onValueChange={setExistingGroupId} disabled={!brandId}>
            <SelectTrigger><SelectValue placeholder="— None —" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— None —</SelectItem>
              {(groups.data ?? []).map((g: any) => (
                <SelectItem key={g.id} value={g.id}>{g.name} ({g.member_count})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>And/or create a new group</Label>
          <Input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder={`e.g. Delivered ${start} → ${end}`}
          />
          <p className="text-xs text-muted-foreground">Leave blank to skip creating a new group.</p>
        </div>
      </div>
      <DialogFooter>
        <Button disabled={!brandId || nothingPicked || mut.isPending} onClick={() => mut.mutate()} className="w-full">
          {mut.isPending ? "Importing…" : "Import & Add to Group(s)"}
        </Button>
      </DialogFooter>

    </DialogContent>
  );
}

function AddToGroupDialog({
  contactIds, brandFilter, brands, onDone,
}: {
  contactIds: string[]; brandFilter: string; brands: { id: string; name: string }[]; onDone: () => void;
}) {
  const fn = useServerFn(addContactsToGroup);
  const [brandId, setBrandId] = useState(brandFilter !== "all" ? brandFilter : "");
  const [groupId, setGroupId] = useState("");
  const groups = useQuery({
    queryKey: ["groups", brandId],
    queryFn: () => listGroupsClient(brandId ? { brand_id: brandId } : {}),
    enabled: !!brandId,
  });
  const mut = useMutation({
    mutationFn: () => fn({ data: { group_id: groupId, contact_ids: contactIds } }),
    onSuccess: (r) => { toast.success(`Added ${r.count} contacts to group`); onDone(); },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Add {contactIds.length} contacts to group</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="space-y-1.5"><Label>Brand</Label>
          <Select value={brandId} onValueChange={(v) => { setBrandId(v); setGroupId(""); }}>
            <SelectTrigger><SelectValue placeholder="Pick a brand" /></SelectTrigger>
            <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5"><Label>Group</Label>
          <Select value={groupId} onValueChange={setGroupId} disabled={!brandId}>
            <SelectTrigger><SelectValue placeholder="Pick a group" /></SelectTrigger>
            <SelectContent>
              {(groups.data ?? []).map((g: any) => (
                <SelectItem key={g.id} value={g.id}>{g.name} ({g.member_count})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button disabled={!groupId || mut.isPending} onClick={() => mut.mutate()} className="w-full">
          {mut.isPending ? "Adding…" : "Add to group"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
