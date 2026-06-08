import type { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { UserMenu } from "./user-menu";
import { useRouterState } from "@tanstack/react-router";

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
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title = titles[pathname] ?? "WA Notifier";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <h1 className="text-base font-semibold tracking-tight">{title}</h1>
            </div>
            <UserMenu />
          </header>
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
