import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Code2, Copy, Plus, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listBrandsLiteClient, listLicensesClient } from "@/lib/client-queries";
import { generateLicense } from "@/lib/licenses.functions";
import { PageHeader } from "@/components/layout/page-header";

export const Route = createFileRoute("/_authenticated/integrations")({
  head: () => ({ meta: [{ title: "Custom Site Integration — WA Suite" }] }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const qc = useQueryClient();
  const fnGen = useServerFn(generateLicense);
  const brands = useQuery({ queryKey: ["brands-lite"], queryFn: () => listBrandsLiteClient() });
  const licenses = useQuery({ queryKey: ["licenses"], queryFn: () => listLicensesClient() });
  const [brandId, setBrandId] = useState<string>("");

  const base = typeof window !== "undefined" ? window.location.origin : "https://your-wa-suite.app";

  const genMut = useMutation({
    mutationFn: (b: string) => fnGen({ data: { brand_id: b, license_type: "custom_site" } }),
    onSuccess: () => { toast.success("Custom site license generated"); qc.invalidateQueries({ queryKey: ["licenses"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  const customLicenses = (licenses.data ?? []).filter((l: any) => l.license_key?.startsWith("WAN-"));

  const copy = (txt: string) => { navigator.clipboard.writeText(txt); toast.success("Copied"); };

  const serverSnippet = `// e.g. /api/send-wa  (Node / Next.js route handler / Vite SSR / Cloudflare Worker)
export async function POST(req) {
  const { recipient, message, customer_name } = await req.json();

  const r = await fetch("${base}/api/public/plugin/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      license_key: process.env.WA_LICENSE_KEY, // keep this server-side only
      recipient,
      message,
      customer_name,
    }),
  });

  return new Response(await r.text(), { status: r.status });
}`;

  const frontendSnippet = `// Anywhere in your React/Vue/etc. app
await fetch("/api/send-wa", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    recipient: "+8801XXXXXXXXX",
    message: \`Hi \${name}, your order #\${id} is confirmed.\`,
    customer_name: name,
  }),
});`;

  const activateSnippet = `# Run once from your server to register the site
curl -X POST ${base}/api/public/plugin/activate \\
  -H "Content-Type: application/json" \\
  -d '{"license_key":"WAN-XXXX-XXXX-XXXX-XXXX","site_url":"https://yoursite.com"}'`;

  const devicesSnippet = `# List devices available to your license
curl "${base}/api/public/plugin/devices?license_key=WAN-XXXX-XXXX-XXXX-XXXX"

# Pick which device sends the messages
curl -X POST ${base}/api/public/plugin/select-device \\
  -H "Content-Type: application/json" \\
  -d '{"license_key":"WAN-XXXX-XXXX-XXXX-XXXX","device_id":"<uuid-from-above>"}'`;

  return (
    <div className="mx-auto max-w-5xl space-y-3">
      <PageHeader
        icon={Code2}
        title="Custom Site Integration"
        description="Send WhatsApp from any website (React, Vue, Next.js, plain PHP, etc.) using a Custom Site License."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" /> 1. Generate a Custom Site License
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            One license = one site. The number of active licenses you can generate is set by your subscription package.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[260px] space-y-1">
              <label className="text-xs text-muted-foreground">Brand</label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger><SelectValue placeholder="Select a brand" /></SelectTrigger>
                <SelectContent>
                  {(brands.data ?? []).map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} <span className="text-muted-foreground">— limit {b.license_limit ?? 1}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={!brandId || genMut.isPending} onClick={() => genMut.mutate(brandId)} className="gap-1">
              <Plus className="h-4 w-4" /> Generate WAN-… key
            </Button>
          </div>

          {customLicenses.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>License Key</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customLicenses.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs">
                      <button onClick={() => copy(l.license_key)} className="inline-flex items-center gap-1 hover:underline">
                        {l.license_key} <Copy className="h-3 w-3" />
                      </button>
                    </TableCell>
                    <TableCell>{l.brand_name}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{l.site_url ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell><Badge variant={l.status === "active" ? "default" : "secondary"}>{l.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Integration Code</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="server">
            <TabsList>
              <TabsTrigger value="server">Server proxy</TabsTrigger>
              <TabsTrigger value="frontend">Frontend call</TabsTrigger>
              <TabsTrigger value="activate">Activate site</TabsTrigger>
              <TabsTrigger value="devices">Pick device</TabsTrigger>
            </TabsList>

            <TabsContent value="server" className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Add this to your backend. <strong>Never put the license key in browser code</strong> — anyone could copy it from DevTools.
              </p>
              <CodeBlock code={serverSnippet} onCopy={copy} />
            </TabsContent>

            <TabsContent value="frontend" className="space-y-2">
              <p className="text-sm text-muted-foreground">Your React / Vue / plain JS calls your own proxy route:</p>
              <CodeBlock code={frontendSnippet} onCopy={copy} />
            </TabsContent>

            <TabsContent value="activate" className="space-y-2">
              <p className="text-sm text-muted-foreground">Run once after generating the license so we record your site:</p>
              <CodeBlock code={activateSnippet} onCopy={copy} />
            </TabsContent>

            <TabsContent value="devices" className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Each license sends through one device. List your devices and pick one:
              </p>
              <CodeBlock code={devicesSnippet} onCopy={copy} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">REST Endpoints</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Method</TableHead>
                <TableHead>Path</TableHead>
                <TableHead>Purpose</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ["POST", "/api/public/plugin/activate", "Register the site_url for the license"],
                ["GET", "/api/public/plugin/devices", "List devices the license can send through"],
                ["POST", "/api/public/plugin/select-device", "Choose which device this license uses"],
                ["POST", "/api/public/plugin/send", "Send a WhatsApp message"],
                ["POST", "/api/public/plugin/heartbeat", "Optional: ping to update last-seen"],
                ["GET", "/api/public/plugin/stats", "7-day send stats for the license"],
              ].map(([m, p, d]) => (
                <TableRow key={p}>
                  <TableCell><Badge variant="outline">{m}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{p}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CodeBlock({ code, onCopy }: { code: string; onCopy: (s: string) => void }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
      <Button size="sm" variant="ghost" className="absolute right-2 top-2 gap-1" onClick={() => onCopy(code)}>
        <Copy className="h-3 w-3" /> Copy
      </Button>
    </div>
  );
}
