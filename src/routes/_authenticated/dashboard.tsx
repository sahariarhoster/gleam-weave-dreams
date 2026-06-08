import { createFileRoute, Link, ClientOnly } from "@tanstack/react-router";
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
  Zap,
  ArrowUpRight,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDashboardStats } from "@/lib/devices.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — WA Notifier" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const fn = useServerFn(getDashboardStats);
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-stats"], queryFn: () => fn() });

  const stats = data ?? {
    devices: 0, devicesOnline: 0, brands: 0, brandUsers: 0, campaigns: 0,
    activeCampaigns: 0, blockedNumbers: 0, totalMessages: 0, delivered: 0,
    failed: 0, pending: 0, todayMessages: 0, series: [], topDevices: [],
  };
  const rate = stats.totalMessages > 0 ? (stats.delivered / stats.totalMessages) * 100 : 0;
  const onlinePct = stats.devices > 0 ? (stats.devicesOnline / stats.devices) * 100 : 0;

  const kpis = [
    { key: "devices", label: "Devices", value: stats.devices, sub: `${stats.devicesOnline} online`, icon: Smartphone, accent: "emerald" },
    { key: "brands", label: "Brands", value: stats.brands, sub: `${stats.brandUsers} members`, icon: Building2, accent: "blue" },
    { key: "campaigns", label: "Campaigns", value: stats.campaigns, sub: `${stats.activeCampaigns} active`, icon: Megaphone, accent: "violet" },
    { key: "blocked", label: "Blocked", value: stats.blockedNumbers, sub: "numbers", icon: Ban, accent: "rose" },
  ] as const;

  return (
    <div className="mx-auto max-w-7xl space-y-3">
      {/* Hero */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden border-border/60 bg-gradient-to-br from-primary/90 via-primary to-primary/70 text-primary-foreground shadow-lg">
          <CardContent className="relative p-4">
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 opacity-60" />
            <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1.5 min-w-0">
                <Badge className="bg-white/20 text-primary-foreground hover:bg-white/30">
                  <Zap className="mr-1 h-3 w-3" /> Live overview
                </Badge>
                <div className="text-2xl font-bold tracking-tight">Welcome back 👋</div>
                <div className="text-sm text-primary-foreground/80">
                  {stats.todayMessages} messages sent today • {stats.activeCampaigns} active campaigns
                </div>
                <div className="flex gap-2 pt-1.5">
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/send">Send SMS <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost" className="text-primary-foreground hover:bg-white/20 hover:text-primary-foreground">
                    <Link to="/campaigns">View campaigns</Link>
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 md:shrink-0">
                <HeroStat label="Sent" value={stats.delivered} />
                <HeroStat label="Failed" value={stats.failed} />
                <HeroStat label="Pending" value={stats.pending} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery rate ring */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" /> Delivery Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="relative h-44">
              <ClientOnly fallback={<div className="h-full w-full" />}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="70%" outerRadius="100%"
                    data={[{ name: "rate", value: rate, fill: "hsl(var(--primary))" }]}
                    startAngle={90} endAngle={-270}
                  >
                    <RadialBar background={{ fill: "hsl(var(--muted))" }} dataKey="value" cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </ClientOnly>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold">{isLoading ? "—" : `${rate.toFixed(1)}%`}</div>
                <div className="text-xs text-muted-foreground">{stats.totalMessages} total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {kpis.map(({ key, ...k }) => (
          <KpiCard key={key} {...k} loading={isLoading} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" /> Messages — Last 7 days
            </CardTitle>
            <Badge variant="secondary">{stats.series.reduce((a, d) => a + d.delivered + d.failed + d.pending, 0)} total</Badge>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-64">
              <ClientOnly fallback={<div className="h-full w-full" />}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gDel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gFail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => new Date(d).toLocaleDateString(undefined, { weekday: "short" })}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11} tickLine={false} axisLine={false}
                    />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={32} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Area type="monotone" dataKey="delivered" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gDel)" />
                    <Area type="monotone" dataKey="failed" stroke="#f43f5e" strokeWidth={2} fill="url(#gFail)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ClientOnly>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-primary" /> Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-44">
              <ClientOnly fallback={<div className="h-full w-full" />}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Delivered", value: stats.delivered, fill: "hsl(var(--primary))" },
                        { name: "Failed", value: stats.failed, fill: "#f43f5e" },
                        { name: "Pending", value: stats.pending, fill: "#f59e0b" },
                      ]}
                      dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={3}
                    >
                      <Cell />
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ClientOnly>
            </div>
            <div className="mt-3 space-y-2">
              <LegendRow color="hsl(var(--primary))" label="Delivered" value={stats.delivered} />
              <LegendRow color="#f43f5e" label="Failed" value={stats.failed} />
              <LegendRow color="#f59e0b" label="Pending" value={stats.pending} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Devices + activity */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-4 w-4 text-primary" /> Recent Devices
            </CardTitle>
            <Button asChild size="sm" variant="ghost">
              <Link to="/devices">View all <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            {stats.topDevices.length === 0 ? (
              <EmptyState label="No devices yet" cta="Add a device" to="/devices" />
            ) : (
              <ul className="divide-y divide-border/60">
                {stats.topDevices.map((d) => {
                  const online = d.status === "active" || d.status === "online";
                  return (
                    <li key={d.id} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${online ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                          {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{d.name}</div>
                          <div className="text-xs text-muted-foreground capitalize">{d.status ?? "unknown"}</div>
                        </div>
                      </div>
                      <Badge variant={online ? "default" : "secondary"}>{online ? "Online" : "Offline"}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" /> Network Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <HealthRow label="Devices online" value={`${stats.devicesOnline}/${stats.devices}`} pct={onlinePct} tone="emerald" />
            <HealthRow label="Delivery rate" value={`${rate.toFixed(0)}%`} pct={rate} tone="primary" />
            <HealthRow
              label="Failure rate"
              value={`${stats.totalMessages > 0 ? ((stats.failed / stats.totalMessages) * 100).toFixed(0) : 0}%`}
              pct={stats.totalMessages > 0 ? (stats.failed / stats.totalMessages) * 100 : 0}
              tone="rose"
            />
            <div className="grid grid-cols-2 gap-3 pt-2">
              <MiniStat icon={CheckCircle2} label="Delivered" value={stats.delivered} tone="text-emerald-600" />
              <MiniStat icon={XCircle} label="Failed" value={stats.failed} tone="text-rose-600" />
              <MiniStat icon={Clock} label="Pending" value={stats.pending} tone="text-amber-600" />
              <MiniStat icon={Megaphone} label="Active" value={stats.activeCampaigns} tone="text-violet-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/15 px-4 py-2.5 min-w-[72px] text-center md:text-left">
      <div className="text-[10px] uppercase tracking-wider text-primary-foreground/70">{label}</div>
      <div className="text-2xl font-bold leading-tight">{value}</div>
    </div>
  );
}

const accentMap: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  violet: "bg-violet-100 text-violet-700",
  rose: "bg-rose-100 text-rose-700",
};

function KpiCard({
  label, value, sub, icon: Icon, accent, loading,
}: { label: string; value: number; sub: string; icon: typeof Smartphone; accent: string; loading?: boolean }) {
  return (
    <Card className="border-border/60 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="mt-2 text-3xl font-bold">{loading ? "—" : value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentMap[accent]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LegendRow({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function HealthRow({ label, value, pct, tone }: { label: string; value: string; pct: number; tone: string }) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500",
    primary: "bg-primary",
    rose: "bg-rose-500",
  };
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${colorMap[tone]} transition-all`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
    </div>
  );
}

function MiniStat({
  icon: Icon, label, value, tone,
}: { icon: typeof CheckCircle2; label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Icon className={`h-3.5 w-3.5 ${tone ?? ""}`} />
        {label}
      </div>
      <div className={`mt-1 text-lg font-bold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function EmptyState({ label, cta, to }: { label: string; cta: string; to: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
      <div className="text-sm text-muted-foreground">{label}</div>
      <Button asChild size="sm" variant="outline" className="mt-3">
        <Link to={to}>{cta}</Link>
      </Button>
    </div>
  );
}
