import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CreditCard, Copy, RefreshCw, Eye, EyeOff, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { getWhmcsSettings, regenerateWhmcsToken } from "@/lib/whmcs.functions";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Billing — WHMCS" }] }),
  component: BillingPage,
});

function BillingPage() {
  const qc = useQueryClient();
  const fnGet = useServerFn(getWhmcsSettings);
  const fnRegen = useServerFn(regenerateWhmcsToken);
  const s = useQuery({ queryKey: ["whmcs-settings"], queryFn: () => fnGet() });
  const [reveal, setReveal] = useState(false);

  const regen = useMutation({
    mutationFn: () => fnRegen(),
    onSuccess: () => { toast.success("Token regenerated"); qc.invalidateQueries({ queryKey: ["whmcs-settings"] }); setReveal(true); },
    onError: (e) => toast.error((e as Error).message),
  });

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const token = s.data?.token ?? "";
  const masked = token ? "•".repeat(Math.min(token.length, 24)) : "Not generated yet";

  const copy = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(`${label} copied`);
  };

  const endpoints = [
    { name: "Provision", path: "/api/public/whmcs/provision" },
    { name: "Suspend", path: "/api/public/whmcs/suspend" },
    { name: "Unsuspend", path: "/api/public/whmcs/unsuspend" },
    { name: "Terminate", path: "/api/public/whmcs/terminate" },
    { name: "Change plan", path: "/api/public/whmcs/update" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <PageHeader
        icon={CreditCard}
        title="Billing — WHMCS"
        description="Connect your WHMCS billing system to automatically provision, suspend, and renew brands."
      />

      <Card className="border-border/60 shadow-sm">
        <CardContent className="space-y-4 pt-6">
          <div>
            <Label>API Token</Label>
            <p className="text-xs text-muted-foreground mb-2">Paste this into the WHMCS module's configuration.</p>
            <div className="flex gap-2">
              <Input readOnly value={reveal ? token : masked} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => setReveal((v) => !v)} disabled={!token}>
                {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="icon" onClick={() => copy(token, "Token")} disabled={!token}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button onClick={() => regen.mutate()} disabled={regen.isPending} className="gap-1">
                <RefreshCw className="h-4 w-4" /> {token ? "Regenerate" : "Generate"}
              </Button>
            </div>
            {token && <p className="text-xs text-amber-600 mt-1.5">Regenerating will break any existing WHMCS connection.</p>}
          </div>

          <div>
            <Label>Server URL</Label>
            <div className="flex gap-2 mt-1">
              <Input readOnly value={baseUrl} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copy(baseUrl, "URL")}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label>Endpoints</Label>
            <div className="mt-2 space-y-1.5">
              {endpoints.map((e) => (
                <div key={e.path} className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                  <Badge variant="secondary" className="w-28 justify-center">{e.name}</Badge>
                  <code className="flex-1 truncate text-xs">{baseUrl}{e.path}</code>
                  <Button variant="ghost" size="icon" onClick={() => copy(baseUrl + e.path, e.name)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              All endpoints expect <code className="rounded bg-muted px-1">POST</code> with header
              <code className="ml-1 rounded bg-muted px-1">X-WHMCS-Token: &lt;token&gt;</code> and a JSON body.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-medium">WHMCS Provisioning Module</h3>
              <p className="text-sm text-muted-foreground">
                Download the PHP module, upload it to <code className="rounded bg-muted px-1">/modules/servers/wanotifier/</code> in your WHMCS install, then create a Product and set this app's URL + token in Server settings.
              </p>
            </div>
            <Button asChild className="gap-1">
              <a href="/whmcs/wanotifier.php" download>
                <Download className="h-4 w-4" /> Download Module
              </a>
            </Button>
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Setup instructions</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
              <li>Generate the API token above and copy the Server URL.</li>
              <li>In WHMCS: <strong>System Settings → Servers → Add New Server</strong>. Module: <code>WA Suite</code>. Hostname: paste your Server URL. Access Hash: paste your API token.</li>
              <li>Create a Server Group containing this server.</li>
              <li>Create a Product (type: Other / Server). Module Settings → Module Name: <code>wanotifier</code>. Configure <em>Message Limit</em>, <em>Device Limit</em>, and the Product ID is sent automatically.</li>
              <li>On Create / Suspend / Unsuspend / Terminate, WHMCS calls the matching endpoint here. Credentials are emailed via WHMCS's "Product/Service Welcome Email".</li>
            </ol>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
