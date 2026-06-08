import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KeyRound, Copy, Trash2, Ban, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listBrandsLite } from "@/lib/brands.functions";
import {
  listMyLicenses,
  generateLicense,
  revokeLicense,
  deleteLicense,
  getLicenseSettings,
} from "@/lib/licenses.functions";

export const Route = createFileRoute("/_authenticated/licenses")({
  head: () => ({ meta: [{ title: "Plugin Licenses — WA Notifier" }] }),
  component: LicensesPage,
});

function LicensesPage() {
  const qc = useQueryClient();
  const fnList = useServerFn(listMyLicenses);
  const fnBrands = useServerFn(listBrandsLite);
  const fnGen = useServerFn(generateLicense);
  const fnRevoke = useServerFn(revokeLicense);
  const fnDel = useServerFn(deleteLicense);
  const fnSettings = useServerFn(getLicenseSettings);

  const licenses = useQuery({ queryKey: ["licenses"], queryFn: () => fnList() });
  const brands = useQuery({ queryKey: ["brands-lite"], queryFn: () => fnBrands() });
  const settings = useQuery({ queryKey: ["license-settings"], queryFn: () => fnSettings() });

  const [brandId, setBrandId] = useState<string>("");

  const genMut = useMutation({
    mutationFn: (b: string) => fnGen({ data: { brand_id: b } }),
    onSuccess: () => { toast.success("License generated"); qc.invalidateQueries({ queryKey: ["licenses"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const revokeMut = useMutation({
    mutationFn: (id: string) => fnRevoke({ data: { id } }),
    onSuccess: () => { toast.success("Revoked"); qc.invalidateQueries({ queryKey: ["licenses"] }); },
    onError: (e) => toast.error((e as Error).message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => fnDel({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["licenses"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast.success("Copied"); };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" /> Generate Plugin License
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] space-y-1">
            <label className="text-xs text-muted-foreground">Brand</label>
            <Select value={brandId} onValueChange={setBrandId}>
              <SelectTrigger><SelectValue placeholder="Select a brand" /></SelectTrigger>
              <SelectContent>
                {(brands.data ?? []).map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={!brandId || genMut.isPending}
            onClick={() => genMut.mutate(brandId)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" /> Generate
          </Button>
          <p className="ml-auto text-xs text-muted-foreground">
            Limit: {settings.data?.licenses_per_brand ?? 1} active license(s) per brand
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Licenses</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>License Key</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(licenses.data ?? []).map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">
                    <button onClick={() => copy(l.license_key)} className="inline-flex items-center gap-1 hover:underline">
                      {l.license_key} <Copy className="h-3 w-3" />
                    </button>
                  </TableCell>
                  <TableCell>{l.brand_name}</TableCell>
                  <TableCell>{l.device_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{l.site_url ?? <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell><Badge variant={l.status === "active" ? "default" : "secondary"}>{l.status}</Badge></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {l.last_seen_at ? format(new Date(l.last_seen_at), "MMM d, HH:mm") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {l.status === "active" && (
                      <Button size="sm" variant="ghost" onClick={() => revokeMut.mutate(l.id)} className="gap-1">
                        <Ban className="h-3.5 w-3.5" /> Revoke
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => delMut.mutate(l.id)} className="gap-1 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(licenses.data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No licenses yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
