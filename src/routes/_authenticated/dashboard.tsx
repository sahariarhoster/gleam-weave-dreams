import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Smartphone,
  Building2,
  Users,
  Megaphone,
  Activity,
  Ban,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardStats } from "@/lib/devices.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — WA Notifier" }] }),
  component: DashboardPage,
});

const kpis = [
  { key: "devices", label: "Devices", icon: Smartphone, accent: "from-emerald-100 to-teal-50 text-emerald-700" },
  { key: "brands", label: "Brands", icon: Building2, accent: "from-blue-100 to-indigo-50 text-blue-700" },
  { key: "brandUsers", label: "Brand Users", icon: Users, accent: "from-amber-100 to-orange-50 text-amber-700" },
  { key: "campaigns", label: "Campaigns", icon: Megaphone, accent: "from-violet-100 to-fuchsia-50 text-violet-700" },
  { key: "activeCampaigns", label: "Active Campaigns", icon: Activity, accent: "from-cyan-100 to-sky-50 text-cyan-700" },
  { key: "blockedNumbers", label: "Blocked Numbers", icon: Ban, accent: "from-rose-100 to-pink-50 text-rose-700" },
] as const;

function DashboardPage() {
  const fn = useServerFn(getDashboardStats);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => fn() });

  const stats = data ?? {
    devices: 0, brands: 0, brandUsers: 0, campaigns: 0, activeCampaigns: 0,
    blockedNumbers: 0, totalMessages: 0, delivered: 0, failed: 0, pending: 0,
  };
  const deliveryRate = stats.totalMessages > 0 ? ((stats.delivered / stats.totalMessages) * 100).toFixed(1) : "—";

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Card className="border-border/60 shadow-sm">
        <CardContent className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-base font-semibold">Welcome back</div>
              <div className="text-sm text-muted-foreground">Here's an overview of your platform activity.</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{deliveryRate}{stats.totalMessages > 0 && "%"}</div>
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Delivery Rate</div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => {
          const value = (stats as Record<string, number>)[k.key];
          return (
            <Card key={k.key} className={`border-border/60 bg-gradient-to-br ${k.accent} shadow-sm`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="text-[10px] font-medium uppercase tracking-wider opacity-80">{k.label}</div>
                  <k.icon className="h-4 w-4 opacity-70" />
                </div>
                <div className="mt-3 text-2xl font-bold">{isLoading ? "—" : value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" /> Message Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile icon={MessageSquare} label="Total Messages" value={stats.totalMessages} />
            <StatTile icon={CheckCircle2} label="Delivered" value={stats.delivered} tone="text-emerald-600" />
            <StatTile icon={XCircle} label="Failed" value={stats.failed} tone="text-rose-600" />
            <StatTile icon={Clock} label="Pending" value={stats.pending} tone="text-amber-600" />
          </div>
          <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/30 p-10 text-center text-sm text-muted-foreground">
            Campaigns and message logs will appear here once you start sending.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  icon: Icon, label, value, tone,
}: { icon: typeof MessageSquare; label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={`h-4 w-4 ${tone ?? ""}`} />
        {label}
      </div>
      <div className={`mt-2 text-2xl font-bold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
