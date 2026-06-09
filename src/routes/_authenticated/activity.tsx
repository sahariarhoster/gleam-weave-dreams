import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listActivityLog } from "@/lib/logs.functions";
import { listBrandsLite } from "@/lib/brands.functions";
import { PageHeader } from "@/components/layout/page-header";

export const Route = createFileRoute("/_authenticated/activity")({
  head: () => ({ meta: [{ title: "Activity Log — WA Suite" }] }),
  component: ActivityPage,
});

function ActivityPage() {
  const fnList = useServerFn(listActivityLog);
  const fnBrands = useServerFn(listBrandsLite);
  const [brand, setBrand] = useState("all");

  const brands = useQuery({ queryKey: ["brands-lite"], queryFn: () => fnBrands() });
  const logs = useQuery({
    queryKey: ["activity", brand],
    queryFn: () => fnList({ data: { brand_id: brand === "all" ? null : brand } }),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        icon={ScrollText}
        title="Activity Log"
        description="Audit trail of system events, plugin pings and admin actions."
        actions={
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {(brands.data ?? []).map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <Card className="border-border/60 shadow-sm">
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.isLoading && (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">Loading…</TableCell></TableRow>
              )}
              {!logs.isLoading && (logs.data?.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">No activity yet.</TableCell></TableRow>
              )}
              {(logs.data ?? []).map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell><Badge variant="outline" className="font-mono text-[10px]">{l.action}</Badge></TableCell>
                  <TableCell className="text-sm">{l.user_name ?? l.user_email ?? "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{l.brand_name ?? "—"}</Badge></TableCell>
                  <TableCell className="max-w-[360px] truncate font-mono text-[11px] text-muted-foreground" title={JSON.stringify(l.details)}>
                    {l.details ? JSON.stringify(l.details) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
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
