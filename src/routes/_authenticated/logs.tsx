import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ListChecks, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listMessageLogs } from "@/lib/logs.functions";
import { listBrandsLite } from "@/lib/brands.functions";
import { PageHeader } from "@/components/layout/page-header";

export const Route = createFileRoute("/_authenticated/logs")({
  head: () => ({ meta: [{ title: "Message Logs — WA Notifier" }] }),
  component: LogsPage,
});

const statusColor: Record<string, string> = {
  sent: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  failed: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  skipped: "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300",
};

function LogsPage() {
  const fnList = useServerFn(listMessageLogs);
  const fnBrands = useServerFn(listBrandsLite);
  const [brand, setBrand] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const brands = useQuery({ queryKey: ["brands-lite"], queryFn: () => fnBrands() });
  const logs = useQuery({
    queryKey: ["logs", brand, status, search],
    queryFn: () =>
      fnList({
        data: {
          brand_id: brand === "all" ? null : brand,
          status: status === "all" ? null : (status as any),
          search: search || null,
        },
      }),
  });

  return (
    <div className="mx-auto max-w-7xl">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4" /> Message Logs
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search phone"
                className="h-9 w-48 pl-8"
              />
            </div>
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
                {(brands.data ?? []).map((b) => (
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
                <TableHead>Campaign</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.isLoading && (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!logs.isLoading && (logs.data?.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No messages yet.</TableCell></TableRow>
              )}
              {(logs.data ?? []).map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.phone}</TableCell>
                  <TableCell className="text-sm">{m.campaign_name ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{m.brand_name ?? "—"}</Badge></TableCell>
                  <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground" title={m.rendered_message ?? ""}>
                    {m.rendered_message ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColor[m.status] ?? ""} variant="outline">
                      {m.status}
                    </Badge>
                    {m.status === "failed" && m.error_message && (
                      <div className="mt-1 max-w-[220px] truncate text-[10px] text-rose-600" title={m.error_message}>
                        {m.error_message}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(m.sent_at ?? m.created_at), { addSuffix: true })}
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
