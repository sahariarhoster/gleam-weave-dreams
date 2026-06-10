import type { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { UserMenu } from "./user-menu";
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
    return <PendingScreen reason={status.data.reason ?? "pending"} />;
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

function PendingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border p-6 text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 grid place-content-center">
          <Clock className="h-7 w-7 text-amber-600" />
        </div>
        <h1 className="text-xl font-bold">Account Pending</h1>
        <p className="text-sm text-muted-foreground">
          Your order is being reviewed. We're verifying your bKash payment — your account will be
          activated within a few hours. You'll get access automatically once approved.
        </p>
        <div className="text-xs text-muted-foreground rounded-md bg-muted p-3">
          Need help? Contact support with your bKash TXID and we'll fast-track verification.
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
