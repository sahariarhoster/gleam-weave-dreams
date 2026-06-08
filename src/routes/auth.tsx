import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  MessageCircle,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Zap,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [showPass, setShowPass] = useState(false);
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
    toast.success("Welcome back!");
    navigate({ to: "/dashboard" });
  }

  async function forgot() {
    if (!email) return toast.error("Enter your email above first");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Password reset email sent");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 h-[480px] w-[480px] rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[520px] w-[520px] rounded-full bg-indigo-500/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          }}
        />
        {/* meteors removed */}
      </div>


      <div className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2 lg:px-8">
        {/* Brand / pitch panel */}
        <section className="hidden flex-col justify-between lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">WA Suite</h1>
              <p className="text-[11px] uppercase tracking-widest text-slate-400">By Hoster Camp</p>
            </div>
          </div>

          <div className="space-y-7">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                All systems operational
              </div>
              <h2 className="text-4xl font-bold leading-tight tracking-tight text-white xl:text-5xl">
                Run WhatsApp campaigns <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">at scale</span>.
              </h2>
              <p className="mt-4 max-w-md text-base leading-7 text-slate-300">
                Devices, brands, members, campaigns and delivery logs — one focused workspace for your whole team.
              </p>
            </div>

            <ul className="space-y-3">
              {[
                { icon: Zap, text: "Lightning-fast bulk sending across devices" },
                { icon: ShieldCheck, text: "Role-based access for brands & members" },
                { icon: BarChart3, text: "Real-time delivery analytics & logs" },
              ].map((f) => (
                <li key={f.text} className="flex items-center gap-3 text-sm text-slate-300">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                    <f.icon className="h-4 w-4 text-emerald-300" />
                  </span>
                  {f.text}
                </li>
              ))}
            </ul>

            {/* WhatsApp-style chat preview */}
            <div className="relative mt-2 w-full max-w-sm overflow-hidden rounded-[28px] border border-slate-200 bg-[#efeae2] shadow-2xl shadow-emerald-900/30">
              {/* Header */}
              <div className="flex items-center gap-3 bg-[#f0f2f5] px-4 py-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
                  HC
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">Hoster Camp Store</div>
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> online
                  </div>
                </div>
                <div className="text-[10px] text-slate-500">business</div>
              </div>

              {/* Messages */}
              <div
                className="space-y-2 px-3 py-4"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 10%, rgba(16,185,129,0.06), transparent 40%), radial-gradient(circle at 80% 90%, rgba(99,102,241,0.05), transparent 40%)",
                }}
              >
                <div className="text-center">
                  <span className="rounded-md bg-white/80 px-2 py-0.5 text-[10px] text-slate-500 shadow-sm">Today</span>
                </div>

                <div className="animate-auth-bubble max-w-[85%] rounded-lg rounded-tl-sm bg-white px-3 py-2 text-[12px] leading-relaxed text-slate-800 shadow" style={{ animationDelay: "0.1s" }}>
                  <div className="mb-1 text-[11px] font-semibold text-emerald-600">✅ Order Placed</div>
                  Hi Sarah! Your order <span className="font-semibold text-slate-900">#HC-2841</span> has been received.
                  <div className="mt-1.5 text-[11px] text-slate-600">
                    1× Wireless Earbuds — <span className="text-slate-900">$49.00</span>
                  </div>
                  <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-slate-400">
                    10:24 AM <span className="text-sky-500">✓✓</span>
                  </div>
                </div>

                <div className="animate-auth-bubble ml-auto max-w-[80%] rounded-lg rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-[12px] leading-relaxed text-slate-800 shadow" style={{ animationDelay: "0.7s" }}>
                  Got it, thanks! 🙌
                  <div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-slate-500">
                    10:25 AM <span className="text-sky-500">✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500">© {new Date().getFullYear()} Hoster Camp · WA Suite</p>
        </section>

        {/* Sign-in card */}
        <section className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">WA Suite</h1>
              <p className="text-[11px] uppercase tracking-widest text-slate-400">By Hoster Camp</p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-bold tracking-tight text-white">Welcome back</h3>
              <p className="mt-1 text-sm text-slate-400">Sign in to continue to your workspace.</p>
            </div>

            <form onSubmit={signIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="si-email" className="text-slate-300">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="si-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="h-11 border-white/10 bg-white/[0.04] pl-10 text-white placeholder:text-slate-500 focus-visible:border-emerald-400/60 focus-visible:ring-emerald-400/30"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="si-pass" className="text-slate-300">Password</Label>
                  <button
                    type="button"
                    onClick={forgot}
                    className="text-xs font-medium text-emerald-300 hover:text-emerald-200"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="si-pass"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 border-white/10 bg-white/[0.04] px-10 text-white placeholder:text-slate-500 focus-visible:border-emerald-400/60 focus-visible:ring-emerald-400/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                <Checkbox className="border-white/20 data-[state=checked]:border-emerald-500 data-[state=checked]:bg-emerald-500" />
                Keep me signed in on this device
              </label>

              <Button
                type="submit"
                disabled={loading}
                className="group h-11 w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:from-emerald-400 hover:to-emerald-500"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>

              <p className="pt-1 text-center text-xs text-slate-500">
                New accounts are created by your workspace owner.
              </p>
            </form>
          </div>



          <p className="mt-6 text-center text-xs text-slate-500">
            Need help? Contact your administrator.
          </p>
        </section>
      </div>
    </div>
  );
}
