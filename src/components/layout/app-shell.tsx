import type { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { UserMenu } from "./user-menu";
import { CreditPill } from "./credit-pill";
import { useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyAccountStatus } from "@/lib/orders.functions";
import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const titles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/devices": "Devices",
  "/brands": "Brands",
  "/users": "Users",
  "/campaigns": "All Campaigns",
  "/send": "Send SMS",
  "/logs": "Message Logs",
  "/blocked": "Blocked Numbers",
  "/activity": "Activity Log",
  "/orders": "Orders",
  "/packages": "Packages",
  "/coupons": "Coupons",
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titles[pathname] ?? "WA Suite";
  const fnStatus = useServerFn(getMyAccountStatus);
  const status = useQuery({ queryKey: ["my-account-status"], queryFn: () => fnStatus(), staleTime: 30_000 });

  if (status.data?.locked) {
    return <PendingScreen reason={status.data.reason ?? "pending"} note={status.data.note ?? null} />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-12 items-center justify-between gap-3 border-b border-border/60 bg-background px-3 md:px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-base font-semibold tracking-tight">{title}</h1>
            </div>
            <UserMenu />
          </header>
          <main className="flex-1 p-3 md:p-4">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function PendingScreen({ reason, note }: { reason: string; note?: string | null }) {
  const cfg: Record<string, { title: string; body: string; tone: string }> = {
    pending: {
      title: "Account Pending",
      body: "Your order is being reviewed. We're verifying your bKash payment — your account will be activated within a few hours.",
      tone: "amber",
    },
    suspended: {
      title: "Account Suspended",
      body: "Your subscription has been suspended. Please contact support to restore access. Your WordPress plugin license is also inactive until reactivation.",
      tone: "red",
    },
    on_hold: {
      title: "Account On Hold",
      body: "Your subscription is currently on hold. All services — including your WordPress plugin license — are paused. Contact support to resume.",
      tone: "amber",
    },
    expired: {
      title: "Subscription Expired",
      body: "Your subscription has expired. Renew from your billing page or contact support to continue using the panel and your WordPress plugin.",
      tone: "red",
    },
  };
  const c = cfg[reason] ?? cfg.pending;
  const ring = c.tone === "red" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600";
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border p-6 text-center space-y-4">
        <div className={`mx-auto w-14 h-14 rounded-full grid place-content-center ${ring}`}>
          <Clock className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold">{c.title}</h1>
        <p className="text-sm text-muted-foreground">{c.body}</p>
        {note ? (
          <div className="text-left text-sm rounded-md border border-amber-200 bg-amber-50 text-amber-900 p-3">
            <div className="font-medium mb-1">Message from support</div>
            <div className="whitespace-pre-wrap">{note}</div>
          </div>
        ) : null}
        <div className="text-xs text-muted-foreground rounded-md bg-muted p-3">
          Need help? Contact support and we'll get you back online quickly.
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/auth";
          }}
        >
          <LogOut className="h-4 w-4 mr-1" /> Sign out
        </Button>
      </div>
    </div>
  );
}
