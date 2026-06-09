import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

import { supabase } from "@/integrations/supabase/client";
import { listBrandsLiteClient } from "@/lib/client-queries";
import { getNotifySettings, saveNotifySettings, sendDailyReportNow } from "@/lib/notify-settings.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [{ title: "Reports — WA Suite" }] }),
  component: ReportsPage,
});

type ReportStats = {
  totals: { sent: number; failed: number; total: number; successRate: number };
  brands: { id: string; name: string; sent: number; failed: number; total: number; successRate: number }[];
};

function todayDhaka(offsetDays = 0) {
  // Asia/Dhaka YYYY-MM-DD
  const now = new Date();
  const bd = new Date(now.getTime() + 6 * 3600 * 1000);
  bd.setUTCDate(bd.getUTCDate() + offsetDays);
  return bd.toISOString().slice(0, 10);
}
const todayISO = todayDhaka;

function ReportsPage() {
  const { user } = useAuth();
  const [start, setStart] = useState(todayISO(-6));
  const [end, setEnd] = useState(todayISO(0));
  const [brandId, setBrandId] = useState<string>("all");

  const brandsQ = useQuery({ queryKey: ["brands-lite"], queryFn: listBrandsLiteClient });

  const stats = useQuery({
    queryKey: ["report-stats", user?.id, start, end, brandId],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.rpc("get_report_stats_for_user", {
        _user_id: user.id,
        _start: start,
        _end: end,
        _brand_id: brandId === "all" ? undefined : brandId,
      });
      if (error) throw new Error(error.message);
      return data as ReportStats;
    },
    enabled: !!user?.id,
  });
  const avgPerDay = useMemo(() => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const days = Math.max(1, Math.round((e - s) / 86400000) + 1);
    return Math.round(t.total / days);
  }, [t.total, start, end]);

  // Owner check
  const rolesQ = useQuery({
    queryKey: ["my-roles", user?.id ?? "anon"],
    queryFn: async () => {
      if (!user?.id) return [] as string[];
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      return (data ?? []).map((r) => r.role as string);
    },
    enabled: !!user?.id,
  });
  const isOwner = (rolesQ.data ?? []).includes("owner");


  const t = stats.data?.totals ?? { sent: 0, failed: 0, total: 0, successRate: 0 };
  const brands = useMemo(() => stats.data?.brands ?? [], [stats.data]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-sm text-muted-foreground">Daily SMS stats by brand. Filter by date range and brand.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div>
            <Label>Start date</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div>
            <Label>End date</Label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <Label>Brand</Label>
            <Select value={brandId} onValueChange={setBrandId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All brands</SelectItem>
                {(brandsQ.data ?? []).map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Total Messages</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{t.total}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Sent</CardTitle></CardHeader><CardContent className="text-3xl font-bold text-green-600">{t.sent}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Failed</CardTitle></CardHeader><CardContent className="text-3xl font-bold text-red-600">{t.failed}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">Success Rate</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{t.successRate}%</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Per-brand breakdown</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Sent</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead className="text-right">Success</TableHead>
                <TableHead className="text-right">Failure</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
              ) : brands.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No data for this period.</TableCell></TableRow>
              ) : brands.map((b) => {
                const fr = b.total > 0 ? Math.round((b.failed / b.total) * 1000) / 10 : 0;
                return (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-right">{b.total}</TableCell>
                    <TableCell className="text-right">{b.sent}</TableCell>
                    <TableCell className="text-right">{b.failed}</TableCell>
                    <TableCell className="text-right"><Badge variant="secondary">{b.successRate}%</Badge></TableCell>
                    <TableCell className="text-right"><Badge variant="outline">{fr}%</Badge></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
