import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({ meta: [{ title: "Sign in — WA Suite" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/40 p-4 sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-5xl overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden bg-primary p-8 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/15 shadow-md">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">WA Suite</h1>
              <p className="text-xs text-primary-foreground/75">WhatsApp campaigns at scale</p>
            </div>
          </div>
          <div className="max-w-md space-y-4">
            <div className="text-4xl font-bold tracking-tight">Manage campaigns without the clutter.</div>
            <p className="text-sm leading-6 text-primary-foreground/80">Devices, brands, members, campaigns, and delivery logs stay organized in one focused workspace.</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-primary-foreground/12 p-3"><div className="text-lg font-bold">Live</div><div className="text-primary-foreground/70">devices</div></div>
            <div className="rounded-lg bg-primary-foreground/12 p-3"><div className="text-lg font-bold">Fast</div><div className="text-primary-foreground/70">sending</div></div>
            <div className="rounded-lg bg-primary-foreground/12 p-3"><div className="text-lg font-bold">Clear</div><div className="text-primary-foreground/70">logs</div></div>
          </div>
        </section>

        <section className="flex flex-col justify-center p-5 sm:p-8">
          <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-md shadow-primary/25">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">WA Suite</h1>
              <p className="text-xs text-muted-foreground">WhatsApp campaigns at scale</p>
            </div>
          </div>

          <Card className="border-border/60 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle>Welcome</CardTitle>
            <CardDescription>Sign in to manage your devices and campaigns.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={signIn} className="space-y-3.5">
              <div className="space-y-2">
                <Label htmlFor="si-email">Email</Label>
                <Input id="si-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="si-pass">Password</Label>
                <Input id="si-pass" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                New accounts are created by your workspace owner.
              </p>
            </form>
          </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
