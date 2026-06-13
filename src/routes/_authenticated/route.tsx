import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/layout/app-shell";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const params = new URLSearchParams((location.searchStr ?? "").replace(/^\?/, ""));
      params.delete("__lovable_token");
      const search = params.toString();
      const redirectTo = `${location.pathname}${search ? `?${search}` : ""}`;
      window.sessionStorage.setItem("postAuthRedirect", redirectTo);
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
