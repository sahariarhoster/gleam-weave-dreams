import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KeyRound, Copy, Trash2, Ban, Plus, Download, Pencil, Check, X, Package, Save } from "lucide-react";
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
import { listBrandsLiteClient, listLicensesClient, listMyRolesClient } from "@/lib/client-queries";
import { useAuth } from "@/hooks/use-auth";
import {
  listMyLicenses,
  generateLicense,
  revokeLicense,
  deleteLicense,
  setBrandLicenseLimit,
} from "@/lib/licenses.functions";
import { getPluginRelease, setPluginRelease } from "@/lib/plugin-release.functions";
import { PageHeader } from "@/components/layout/page-header";

export const Route = createFileRoute("/_authenticated/licenses")({
  head: () => ({ meta: [{ title: "Plugin Licenses — WA Suite" }] }),
  component: LicensesPage,
});

function LicensesPage() {
  const qc = useQueryClient();
  const fnList = useServerFn(listMyLicenses);
  const fnBrands = useServerFn(listBrandsLite);
  const fnGen = useServerFn(generateLicense);
  const fnRevoke = useServerFn(revokeLicense);
  const fnDel = useServerFn(deleteLicense);
  const fnSetLimit = useServerFn(setBrandLicenseLimit);
  const fnRoles = useServerFn(getMyRoles);
  const fnGetRelease = useServerFn(getPluginRelease);
  const fnSetRelease = useServerFn(setPluginRelease);

  const licenses = useQuery({ queryKey: ["licenses"], queryFn: () => fnList() });
  const brands = useQuery({ queryKey: ["brands-lite"], queryFn: () => fnBrands() });
  const roles = useQuery({ queryKey: ["my-roles"], queryFn: () => fnRoles() });
  const release = useQuery({ queryKey: ["plugin-release"], queryFn: () => fnGetRelease() });
  const isOwner = (roles.data ?? []).includes("owner");

  const [brandId, setBrandId] = useState<string>("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(1);
  const [rel, setRel] = useState<{ version: string; url: string; changelog: string; tested: string; requires: string; requires_php: string }>({
    version: "", url: "", changelog: "", tested: "", requires: "", requires_php: "",
  });
  const [relLoaded, setRelLoaded] = useState(false);
  if (!relLoaded && release.data) {
    setRel({
      version: release.data.plugin_version ?? "",
      url: release.data.plugin_download_url ?? "",
      changelog: release.data.plugin_changelog ?? "",
      tested: release.data.plugin_tested_wp ?? "",
      requires: release.data.plugin_requires_wp ?? "",
      requires_php: release.data.plugin_requires_php ?? "",
    });
    setRelLoaded(true);
  }

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
  const limitMut = useMutation({
    mutationFn: (p: { brand_id: string; limit: number }) => fnSetLimit({ data: p }),
    onSuccess: () => {
      toast.success("Limit updated");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["brands-lite"] });
      qc.invalidateQueries({ queryKey: ["licenses"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const releaseMut = useMutation({
    mutationFn: () => fnSetRelease({ data: {
      plugin_version: rel.version,
      plugin_download_url: rel.url || null,
      plugin_changelog: rel.changelog || null,
      plugin_tested_wp: rel.tested || null,
      plugin_requires_wp: rel.requires || null,
      plugin_requires_php: rel.requires_php || null,
    } }),
    onSuccess: () => { toast.success("Plugin release saved"); qc.invalidateQueries({ queryKey: ["plugin-release"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast.success("Copied"); };

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <PageHeader
        icon={KeyRound}
        title="Plugin Licenses"
        description="Manage WordPress plugin licenses and releases."
        actions={
          <Button asChild size="sm" className="gap-1">
            <a href="/wa-notifier-woocommerce.zip" download>
              <Download className="h-4 w-4" /> Download Plugin
            </a>
          </Button>
        }
      />
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            Install this plugin on your WooCommerce site, then run the setup wizard and paste a license key generated below.
          </p>
        </CardContent>
      </Card>

      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" /> Plugin Release (Auto-Update)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Sites with an active license will see this version on their WordPress Plugins screen and can update with one click.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Version (x.y.z)</Label>
                <Input value={rel.version} onChange={(e) => setRel({ ...rel, version: e.target.value })} placeholder="1.0.1" />
              </div>
              <div className="space-y-1">
                <Label>Download URL (leave blank to use /wa-notifier-woocommerce.zip)</Label>
                <Input value={rel.url} onChange={(e) => setRel({ ...rel, url: e.target.value })} placeholder="https://..." />
              </div>
              <div className="space-y-1">
                <Label>Tested up to (WP)</Label>
                <Input value={rel.tested} onChange={(e) => setRel({ ...rel, tested: e.target.value })} placeholder="6.6" />
              </div>
              <div className="space-y-1">
                <Label>Requires WP</Label>
                <Input value={rel.requires} onChange={(e) => setRel({ ...rel, requires: e.target.value })} placeholder="6.0" />
              </div>
              <div className="space-y-1">
                <Label>Requires PHP</Label>
                <Input value={rel.requires_php} onChange={(e) => setRel({ ...rel, requires_php: e.target.value })} placeholder="7.4" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Changelog</Label>
              <Textarea rows={4} value={rel.changelog} onChange={(e) => setRel({ ...rel, changelog: e.target.value })} placeholder="- Fixed ..." />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => releaseMut.mutate()} disabled={releaseMut.isPending} className="gap-1">
                <Save className="h-4 w-4" /> Save Release
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


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
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Brand Limits</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Active License Limit</TableHead>
                {isOwner && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(brands.data ?? []).map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell>{b.name}</TableCell>
                  <TableCell>
                    {editing === b.id ? (
                      <Input
                        type="number"
                        min={1}
                        max={1000}
                        value={editValue}
                        onChange={(e) => setEditValue(Number(e.target.value))}
                        className="w-24"
                      />
                    ) : (
                      <span>{b.license_limit ?? 1}</span>
                    )}
                  </TableCell>
                  {isOwner && (
                    <TableCell className="text-right">
                      {editing === b.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => limitMut.mutate({ brand_id: b.id, limit: editValue })}
                            disabled={limitMut.isPending}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setEditing(b.id); setEditValue(b.license_limit ?? 1); }}
                          className="gap-1"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
              {(brands.data ?? []).length === 0 && (
                <TableRow><TableCell colSpan={isOwner ? 3 : 2} className="text-center text-muted-foreground">No brands</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
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
