import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Smartphone,
  Building2,
  Users,
  Megaphone,
  Send,
  ListChecks,
  Ban,
  ScrollText,
  MessageCircle,
  Contact,
  FolderOpen,
  KeyRound,
  CreditCard,
  Wrench,
  BarChart3,
  ShoppingBag,
  Package,
  Tag,
  Repeat,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Devices", url: "/devices", icon: Smartphone },
  { title: "Brands", url: "/brands", icon: Building2, anyRole: ["owner", "support_agent"] as string[] },
  { title: "Users", url: "/users", icon: Users, ownerOnly: true },
  { title: "Members", url: "/members", icon: Users, brandOwnerOnly: true },
  { title: "Contacts", url: "/contacts", icon: Contact, hideForRoles: ["support_agent"] as string[] },
  { title: "Groups", url: "/groups", icon: FolderOpen, hideForRoles: ["support_agent"] as string[] },
  { title: "All Campaigns", url: "/campaigns", icon: Megaphone },
  { title: "Send SMS", url: "/send", icon: Send },
  { title: "Message Logs", url: "/logs", icon: ListChecks },
  { title: "Reports", url: "/reports", icon: BarChart3 },
  { title: "Blocked Numbers", url: "/blocked", icon: Ban },
  { title: "Activity Log", url: "/activity", icon: ScrollText },
  { title: "Plugin Licenses", url: "/licenses", icon: KeyRound, anyRole: ["owner", "brand_owner", "support_agent"] as string[] },
  { title: "Device Requests", url: "/device-requests", icon: Wrench, anyRole: ["owner", "brand_owner", "sales_agent", "support_agent"] as string[] },
  { title: "Billing (WHMCS)", url: "/billing", icon: CreditCard, ownerOnly: true },
  { title: "Orders", url: "/orders", icon: ShoppingBag, anyRole: ["owner", "support_agent"] as string[] },
  { title: "Packages", url: "/packages", icon: Package, ownerOnly: true },
  { title: "Coupons", url: "/coupons", icon: Tag, anyRole: ["owner", "support_agent"] as string[] },
  { title: "Subscriptions", url: "/subscriptions", icon: Repeat },



] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const roles = useQuery({
    queryKey: ["my-roles", user?.id ?? "anon"],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => r.role as string);
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
  const isOwner = (roles.data ?? []).includes("owner");
  const isBrandOwner = (roles.data ?? []).includes("brand_owner");
  const userRoles = roles.data ?? [];
  const visibleItems = items.filter((i) => {
    const o = "ownerOnly" in i && (i as any).ownerOnly;
    const b = "brandOwnerOnly" in i && (i as any).brandOwnerOnly;
    const bo = "brandOwnerOrOwner" in i && (i as any).brandOwnerOrOwner;
    const ar = "anyRole" in i ? ((i as any).anyRole as string[] | undefined) : undefined;
    const hide = "hideForRoles" in i ? ((i as any).hideForRoles as string[] | undefined) : undefined;
    if (hide && hide.some((r) => userRoles.includes(r)) && !isOwner) return false;
    if (o) return isOwner;
    if (b) return isBrandOwner;
    if (bo) return isOwner || isBrandOwner;
    if (ar) return ar.some((r) => userRoles.includes(r));
    return true;
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2.5 px-1 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/30">
            <MessageCircle className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">WA Suite</div>
              <div className="truncate text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                By Hoster Camp
              </div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const active = pathname === item.url || pathname.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
