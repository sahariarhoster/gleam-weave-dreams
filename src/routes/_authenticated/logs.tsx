import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ListChecks, Search, AlertCircle, Eye, X } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listMessageLogsClient, listBrandsLiteClient } from "@/lib/client-queries";
import { PageHeader } from "@/components/layout/page-header";
import { supabase } from "@/integrations/supabase/client";

const logsSearchSchema = z.object({
  campaign: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/_authenticated/logs")({
  head: () => ({ meta: [{ title: "Message Logs — WA Suite" }] }),
  validateSearch: zodValidator(logsSearchSchema),
  component: LogsPage,
});


const statusColor: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  skipped: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300",
};

// Map raw API/SDK errors → friendly, user-facing reasons.
function friendlyReason(raw: string | null | undefined): string {
  if (!raw) return "Unknown error";
  const s = raw.toLowerCase();
  if (s.includes("not exist") || s.includes("no whatsapp") || s.includes("not registered") || s.includes("not a whatsapp"))
    return "WhatsApp account does not exist for this number";
  if (s.includes("invalid") && s.includes("number")) return "Invalid phone number";
  if (s.includes("blocked")) return "Recipient is blocked";
  if (s.includes("unauthor") || s.includes("forbidden") || s.includes("401") || s.includes("403"))
    return "Device not authorized / token rejected";
  if (s.includes("offline") || s.includes("disconnected") || s.includes("not connected"))
    return "Device offline or disconnected";
  if (s.includes("rate") || s.includes("too many") || s.includes("429"))
    return "Rate limited — too many sends";
  if (s.includes("timeout") || s.includes("timed out")) return "Request timed out";
  if (s.includes("network") || s.includes("econn") || s.includes("fetch")) return "Network / API failure";
  if (s.startsWith("http 5") || s.includes("server error") || s.includes("500"))
    return "WhatsApp API server error";
  return raw;
}

function LogsPage() {
  const { campaign } = Route.useSearch();
  const [brand, setBrand] = useState("all");
  const [status, setStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<any>(null);

  const brands = useQuery({ queryKey: ["brands-lite"], queryFn: () => listBrandsLiteClient() });
  const campaignInfo = useQuery({
    queryKey: ["campaign-info", campaign],
    enabled: !!campaign,
    queryFn: async () => {
      const { data } = await supabase.from("campaigns").select("id, name").eq("id", campaign!).maybeSingle();
      return data;
    },
  });
  const logs = useQuery({
    queryKey: ["logs", brand, status, source, search, campaign],
    queryFn: () =>
      listMessageLogsClient({
        brand_id: brand === "all" ? null : brand,
        status: status === "all" ? null : status,
        source: campaign ? "campaign" : source === "all" ? null : source,
        search: search || null,
        campaign_id: campaign ?? null,
      }),
  });


  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        icon={ListChecks}
        title="Message History"
        description="Every WhatsApp message sent — by campaign, plugin or single send — with delivery status and failure reason."
      />
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-3">
          <div className="text-sm font-medium text-muted-foreground">All messages</div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search phone" className="h-9 w-44 pl-8" />
            </div>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="campaign">Campaign</SelectItem>
                <SelectItem value="plugin">Plugin</SelectItem>
                <SelectItem value="single">Single Send</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {(brands.data ?? []).map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status / Reason</TableHead>
                <TableHead className="text-right">When</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.isLoading && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!logs.isLoading && (logs.data?.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No messages yet.</TableCell></TableRow>
              )}
              {(logs.data ?? []).map((m: any) => {
                const reason = m.status === "failed" ? friendlyReason(m.error_message) : null;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.phone || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{m.brand_name ?? "—"}</Badge></TableCell>
                    <TableCell className="text-xs">{m.source_label}</TableCell>
                    <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground" title={m.rendered_message ?? ""}>
                      {m.rendered_message ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColor[m.status] ?? ""} variant="outline">{m.status}</Badge>
                      {reason && (
                        <div className="mt-1 flex max-w-[240px] items-start gap-1 text-[11px] text-rose-600" title={m.error_message ?? ""}>
                          <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                          <span className="truncate">{reason}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground" title={format(new Date(m.sent_at ?? m.created_at), "PPpp")}>
                      {formatDistanceToNow(new Date(m.sent_at ?? m.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDetail(m)}>
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Message details</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <DetailRow label="Phone" value={<span className="font-mono">{detail.phone || "—"}</span>} />
              <DetailRow label="Brand" value={detail.brand_name ?? "—"} />
              <DetailRow label="Source" value={detail.source_label} />
              <DetailRow label="Status" value={<Badge className={statusColor[detail.status] ?? ""} variant="outline">{detail.status}</Badge>} />
              {detail.status === "failed" && (
                <DetailRow
                  label="Reason"
                  value={<span className="text-rose-600">{friendlyReason(detail.error_message)}</span>}
                />
              )}
              {detail.error_message && (
                <DetailRow label="Raw error" value={<code className="break-all text-xs text-muted-foreground">{detail.error_message}</code>} />
              )}
              <DetailRow label="Sent" value={format(new Date(detail.sent_at ?? detail.created_at), "PPpp")} />
              <div>
                <div className="mb-1 text-xs font-medium text-muted-foreground">Message</div>
                <div className="rounded-md border bg-muted/50 p-2 text-xs whitespace-pre-wrap">{detail.rendered_message ?? "—"}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-right">{value}</div>
    </div>
  );
}
