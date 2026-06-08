import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Send, Shield, Zap, DollarSign, ShoppingCart, CheckCircle2, ArrowRight,
  MessageSquare, Sparkles, Users, BarChart3, Lock, Globe, Star,
  TrendingUp, Quote, Mail, Wallet,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WA Suite — বাল্ক হোয়াটসঅ্যাপ মেসেজিং বাংলাদেশে" },
      {
        name: "description",
        content:
          "বাংলাদেশের জন্য সবচেয়ে সাশ্রয়ী হোয়াটসঅ্যাপ বাল্ক মেসেজিং প্ল্যাটফর্ম। WooCommerce অর্ডার নোটিফিকেশন, ব্যান প্রোটেকশন, এবং অফিসিয়াল API-এর তুলনায় ১০x কম খরচে।",
      },
      { property: "og:title", content: "WA Suite — বাল্ক হোয়াটসঅ্যাপ মেসেজিং বাংলাদেশে" },
      { property: "og:description", content: "WooCommerce প্লাগইন, ব্যান প্রোটেকশন এবং অফিসিয়াল API-এর তুলনায় ১০x কম খরচ।" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div lang="bn" className="font-bangla min-h-screen bg-background text-foreground antialiased">
      <Header />
      <main>
        <Hero />
        <LogoMarquee />
        <TrustStrip />
        <BulkSection />
        <PluginSection />
        <ProtectionSection />
        <Testimonials />
        <PricingSection />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

/* ---------------- Header ---------------- */
function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary via-primary to-[color:var(--color-emerald-deep)] text-primary-foreground shadow-[0_10px_30px_-12px_var(--primary)]">
            <MessageSquare className="h-4.5 w-4.5" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[color:var(--color-gold)] ring-2 ring-background" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            WA <span className="text-primary">Suite</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#bulk" className="transition hover:text-foreground">বাল্ক মেসেজ</a>
          <a href="#plugin" className="transition hover:text-foreground">WordPress প্লাগইন</a>
          <a href="#protection" className="transition hover:text-foreground">ব্যান প্রোটেকশন</a>
          <a href="#pricing" className="transition hover:text-foreground">প্রাইসিং</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition hover:text-foreground sm:inline-flex"
          >
            লগইন
          </Link>
          <Link
            to="/auth"
            className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-md bg-foreground px-3.5 py-2 text-sm font-semibold text-background shadow-sm transition hover:opacity-95"
          >
            <span className="relative z-10">শুরু করুন</span>
            <ArrowRight className="relative z-10 h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ---------------- Hero ---------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      {/* Soft mesh background */}
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[560px] w-[900px] -translate-x-1/2 -translate-y-1/2 opacity-[0.18] blur-[120px]">
        <div className="absolute inset-0 rounded-full bg-primary" />
        <div className="absolute right-0 top-0 h-1/2 w-1/2 rounded-full bg-[color:var(--color-gold)]" />
      </div>
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[600px] bg-grid-soft opacity-60" />

      <div className="relative mx-auto max-w-7xl px-6 py-20 text-center sm:py-24 lg:py-28">
        {/* Floating dashboard cards (desktop) */}
        <div aria-hidden className="pointer-events-none hidden lg:block">
          <div className="absolute left-6 top-[22%] w-52 -rotate-6 rounded-2xl border border-border bg-card/85 p-4 shadow-xl backdrop-blur-md animate-float">
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary">
                <Mail className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold text-foreground">সফল ডেলিভারি</span>
            </div>
            <div className="font-display text-2xl font-bold tracking-tight text-primary">৯৯.৯%</div>
          </div>
          <div
            className="absolute right-6 top-[28%] w-56 rotate-3 rounded-2xl border border-border bg-card/85 p-4 shadow-xl backdrop-blur-md animate-float"
            style={{ animationDelay: "-2.5s" }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--color-gold)]/20 text-[color:var(--color-emerald-deep)]">
                <Wallet className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold text-foreground">খরচ বাঁচান</span>
            </div>
            <div className="font-display text-lg font-bold uppercase tracking-tight text-foreground">
              ১০ গুন সাশ্রয়ী
            </div>
          </div>
          <div
            className="absolute bottom-[12%] left-12 w-48 rotate-2 rounded-2xl border border-border bg-card/85 p-4 shadow-xl backdrop-blur-md animate-float"
            style={{ animationDelay: "-5s" }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/15 text-primary">
                <Shield className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold text-foreground">ব্যান প্রোটেকশন</span>
            </div>
            <div className="font-display text-sm font-bold text-foreground">৬ লেয়ার অ্যাক্টিভ</div>
          </div>
          <div
            className="absolute -right-2 bottom-[18%] w-52 -rotate-3 rounded-2xl border border-border bg-card/85 p-4 shadow-xl backdrop-blur-md animate-float"
            style={{ animationDelay: "-3.5s" }}
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--color-gold)]/20 text-[color:var(--color-emerald-deep)]">
                <TrendingUp className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold text-foreground">আজকের পাঠানো</span>
            </div>
            <div className="font-display text-lg font-bold text-foreground">১২,৫০০+</div>
          </div>
        </div>

        {/* Centered content */}
        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-emerald-deep)] sm:text-xs">
              বাংলাদেশের #১ হোয়াটসঅ্যাপ মার্কেটিং প্ল্যাটফর্ম
            </p>
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl font-extrabold leading-[1.15] tracking-tight text-[color:var(--color-emerald-deep)] sm:text-6xl md:text-7xl">
            হাজারো কাস্টমারের কাছে{" "}
            <span className="bg-gradient-to-r from-primary to-[color:var(--color-gold)] bg-clip-text text-transparent">
              এক ক্লিকেই
            </span>{" "}
            হোয়াটসঅ্যাপ মেসেজ
          </h1>

          {/* Description */}
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-foreground/70 md:text-xl">
            বাল্ক প্রোমোশন, WooCommerce অর্ডার নোটিফিকেশন, এবং এক্সট্রিম ব্যান প্রোটেকশন —
            অফিসিয়াল API-এর তুলনায়{" "}
            <span className="font-bold text-primary underline decoration-[color:var(--color-gold)] decoration-2 underline-offset-4">
              ১০x কম খরচে
            </span>
            । ছোট থেকে বড়, প্রতিটি বিজনেসের জন্য।
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              to="/auth"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/25 transition-all hover:scale-[1.03] hover:bg-[color:var(--color-emerald-deep)] active:scale-95"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition duration-700 group-hover:translate-x-full" />
              <span className="relative">ফ্রি ট্রায়াল শুরু করুন</span>
              <ArrowRight className="relative h-5 w-5 transition group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-border bg-background px-8 py-4 text-base font-bold text-foreground transition hover:border-primary hover:text-primary"
            >
              প্রাইসিং দেখুন
            </a>
          </div>

          {/* Trust signals */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-foreground/70 md:gap-10">
            {[
              "ক্রেডিট কার্ড ছাড়াই",
              "৫ মিনিটে সেটআপ",
              "বাংলায় ২৪/৭ সাপোর্ট",
            ].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="font-medium">{t}</span>
              </div>
            ))}
          </div>

          {/* Social proof bar */}
          <div className="mt-12 w-full max-w-xl bg-gradient-to-r from-transparent via-primary/15 to-transparent p-px">
            <div className="flex flex-col items-center gap-4 bg-background px-8 py-4 sm:flex-row">
              <div className="flex -space-x-2">
                {["#0d7a5f", "#064e3b", "#c9a84c", "#f5f0e0"].map((c, i) => (
                  <span
                    key={i}
                    className="h-10 w-10 rounded-full border-2 border-background"
                    style={{ background: c }}
                  />
                ))}
                <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-background bg-[color:var(--color-gold-soft)] text-xs font-bold text-[color:var(--color-emerald-deep)]">
                  +2k
                </span>
              </div>
              <div className="text-center sm:text-left">
                <div className="flex justify-center gap-0.5 text-[color:var(--color-gold)] sm:justify-start">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm font-medium text-foreground/60">
                  ২,৫০০+ ব্যবসায়ীর বিশ্বস্ত সঙ্গী
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

  return (
    <section className="relative overflow-hidden">
      {/* Aurora glow */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[640px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_28%,transparent)_0%,transparent_75%)] animate-aurora blur-2xl" />
        <div className="absolute right-[-10%] top-[8%] h-[420px] w-[520px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-gold)_32%,transparent)_0%,transparent_70%)] animate-aurora blur-3xl" style={{ animationDelay: "-7s" }} />
        <div className="absolute left-[-8%] top-[30%] h-[380px] w-[480px] rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--color-emerald-deep)_28%,transparent)_0%,transparent_70%)] animate-aurora blur-3xl" style={{ animationDelay: "-3s" }} />
      </div>
      {/* Grid */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid-soft opacity-70" />

      <div className="mx-auto max-w-7xl px-4 pt-16 pb-24 sm:px-6 sm:pt-24 lg:pt-28">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          {/* Copy */}
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-gold)]/50 bg-gradient-to-r from-[color:var(--color-gold-soft)]/40 to-[color:var(--color-gold-soft)]/10 px-3 py-1 text-xs font-semibold text-[color:var(--color-emerald-deep)] shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              বাংলাদেশের #১ হোয়াটসঅ্যাপ মেসেজিং প্ল্যাটফর্ম
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.2rem]">
              হাজারো কাস্টমারের কাছে{" "}
              <span className="text-shimmer">এক ক্লিকেই</span>{" "}
              হোয়াটসঅ্যাপ মেসেজ
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
              বাল্ক প্রমোশন, WooCommerce অর্ডার নোটিফিকেশন, এবং এক্সট্রিম ব্যান প্রোটেকশন —
              অফিসিয়াল API-এর তুলনায় <strong className="text-foreground">১০x কম খরচে</strong>।
              ছোট থেকে বড়, প্রতিটি বিজনেসের জন্য।
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                to="/auth"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg bg-gradient-to-br from-primary to-[color:var(--color-emerald-deep)] px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_20px_50px_-15px_var(--primary)] transition hover:shadow-[0_25px_60px_-15px_var(--primary)]"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-700 group-hover:translate-x-full" />
                <span className="relative">ফ্রি ট্রায়াল শুরু করুন</span>
                <ArrowRight className="relative h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/60 px-5 py-3 text-sm font-semibold text-foreground backdrop-blur transition hover:bg-accent"
              >
                প্রাইসিং দেখুন
              </a>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground lg:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> ক্রেডিট কার্ড ছাড়াই
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> ৫ মিনিটে সেটআপ
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> বাংলায় ২৪/৭ সাপোর্ট
              </span>
            </div>

            {/* Trust rating */}
            <div className="mt-7 inline-flex items-center gap-3 rounded-xl border border-border/60 bg-card/70 px-4 py-2.5 shadow-sm backdrop-blur">
              <div className="flex -space-x-2">
                {["#10b981", "#f59e0b", "#3b82f6", "#ef4444"].map((c, i) => (
                  <span key={i} className="h-7 w-7 rounded-full ring-2 ring-card" style={{ background: c }} />
                ))}
              </div>
              <div className="flex flex-col items-start">
                <div className="flex items-center gap-0.5 text-[color:var(--color-gold)]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground">২,৫০০+ ব্যবসার বিশ্বস্ত</span>
              </div>
            </div>
          </div>

          {/* Phone mockup */}
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}

function PhoneMockup() {
  const messages = [
    { from: "biz", text: "আসসালামু আলাইকুম রহিম ভাই! আপনার অর্ডার #১২৩৪ আমরা পেয়েছি ✅", time: "১০:২১" },
    { from: "user", text: "ধন্যবাদ। কখন পাবো?", time: "১০:২১" },
    { from: "biz", text: "আজ সন্ধ্যা ৬টার মধ্যে ডেলিভারি হবে। ট্র্যাকিং: BD‑৮৮৪২", time: "১০:২২" },
    { from: "biz", text: "🎁 ঈদ অফার: পরবর্তী অর্ডারে ৫০% ছাড়! কোড: EID50", time: "১০:২২" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      {/* Floating side cards */}
      <div className="absolute -left-6 top-8 hidden rounded-xl border border-border/60 bg-card/90 p-3 shadow-xl backdrop-blur animate-float sm:block">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
            <TrendingUp className="h-4 w-4" />
          </span>
          <div>
            <div className="text-xs text-muted-foreground">আজকের ডেলিভারি</div>
            <div className="font-display text-sm font-bold">৯৯.৭%</div>
          </div>
        </div>
      </div>
      <div className="absolute -right-4 bottom-12 hidden rounded-xl border border-border/60 bg-card/90 p-3 shadow-xl backdrop-blur animate-float sm:block" style={{ animationDelay: "-2s" }}>
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[color:var(--color-gold)]/20 text-[color:var(--color-emerald-deep)]">
            <Shield className="h-4 w-4" />
          </span>
          <div>
            <div className="text-xs text-muted-foreground">ব্যান প্রোটেকশন</div>
            <div className="font-display text-sm font-bold">৬ লেয়ার অ্যাক্টিভ</div>
          </div>
        </div>
      </div>

      {/* Phone body */}
      <div className="relative mx-auto h-[600px] w-[300px] rounded-[2.6rem] border border-foreground/15 bg-foreground p-2.5 shadow-[0_50px_120px_-30px_color-mix(in_oklab,var(--primary)_50%,transparent)]">
        <div className="absolute left-1/2 top-2.5 z-10 h-5 w-24 -translate-x-1/2 rounded-b-2xl bg-foreground" />
        <div className="relative h-full w-full overflow-hidden rounded-[2.1rem] bg-[#e7ddd3]">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-2 text-[10px] font-semibold text-white/95">
            <span>১০:২২</span>
            <div className="flex items-center gap-1">
              <Signal className="h-2.5 w-2.5" />
              <Wifi className="h-2.5 w-2.5" />
              <Battery className="h-3 w-3" />
            </div>
          </div>
          {/* WhatsApp header */}
          <div className="mt-1 flex items-center gap-2.5 bg-[#075e54] px-3 py-2.5 text-white">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-xs font-bold">RA</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">রহমান এন্টারপ্রাইজ</div>
              <div className="text-[10px] text-white/70">online · typing…</div>
            </div>
            <Phone className="h-4 w-4" />
          </div>
          {/* Chat */}
          <div
            className="space-y-2 px-3 py-3"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.5) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.4) 0, transparent 40%)",
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[80%] animate-auth-bubble rounded-lg px-2.5 py-1.5 text-[11px] leading-snug shadow-sm ${
                  m.from === "biz"
                    ? "ml-auto bg-[#dcf8c6] text-slate-800"
                    : "mr-auto bg-white text-slate-800"
                }`}
                style={{ animationDelay: `${i * 250}ms` }}
              >
                <p>{m.text}</p>
                <div className="mt-0.5 text-right text-[9px] text-slate-500">
                  {m.time} {m.from === "biz" && <span className="text-[#34b7f1]">✓✓</span>}
                </div>
              </div>
            ))}
            {/* typing indicator */}
            <div className="mr-auto inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-2 shadow-sm">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-slate-400"
                  style={{ animation: `auth-bubble-in 0.9s ${i * 0.15}s infinite alternate` }}
                />
              ))}
            </div>
          </div>
          {/* Input */}
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 border-t border-black/5 bg-[#f0f0f0] px-3 py-2">
            <div className="flex-1 rounded-full bg-white px-3 py-1.5 text-[10px] text-slate-400">Message</div>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-[#075e54] text-white animate-glow">
              <Send className="h-3 w-3" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Logo marquee ---------------- */
function LogoMarquee() {
  const brands = [
    "Daraz Sellers", "Rokomari", "Pickaboo", "Chaldal Partners", "Foodpanda",
    "Evaly Stores", "Othoba", "Ajkerdeal", "Pathao Pay", "bKash Merchants",
  ];
  return (
    <section className="border-y border-border/60 bg-secondary/30 py-7 overflow-hidden">
      <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        বাংলাদেশের শীর্ষ ব্র্যান্ড ও মার্চেন্টদের আস্থা
      </p>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-background to-transparent" />
        <div className="absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-background to-transparent" />
        <div className="flex w-max gap-12 animate-marquee">
          {[...brands, ...brands].map((b, i) => (
            <span key={i} className="font-display text-xl font-bold tracking-tight text-muted-foreground/60 whitespace-nowrap">
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Trust strip ---------------- */
function TrustStrip() {
  const stats = [
    { value: "৫০M+", label: "মেসেজ ডেলিভার্ড" },
    { value: "২,৫০০+", label: "সক্রিয় ব্যবসা" },
    { value: "৯৯.৭%", label: "ডেলিভারি রেট" },
    { value: "১০x", label: "সস্তা অফিসিয়াল API থেকে" },
  ];
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-card px-6 py-8 text-center transition hover:bg-accent/30">
              <div className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                <span className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {s.value}
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Feature section helper ---------------- */
function FeatureSection(props: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  description: string;
  bullets: string[];
  visual: ReactNode;
  reverse?: boolean;
}) {
  return (
    <section id={props.id} className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className={`grid items-center gap-12 lg:grid-cols-2 ${props.reverse ? "lg:[&>div:first-child]:order-2" : ""}`}>
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              {props.eyebrow}
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {props.title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {props.description}
            </p>
            <ul className="mt-7 space-y-3.5">
              {props.bullets.map((b) => (
                <li key={b} className="flex gap-3 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-foreground/90">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>{props.visual}</div>
        </div>
      </div>
      <div className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
        <div className="gold-divider" />
      </div>
    </section>
  );
}

/* ---------------- Bulk Section ---------------- */
function BulkSection() {
  return (
    <FeatureSection
      id="bulk"
      eyebrow="বাল্ক মেসেজিং"
      title={<>একসাথে হাজারো কাস্টমারকে <span className="text-shimmer">হোয়াটসঅ্যাপ</span> পাঠান</>}
      description="CSV আপলোড করুন, কন্টাক্ট গ্রুপ তৈরি করুন, এবং পার্সোনালাইজড টেমপ্লেট দিয়ে ক্যাম্পেইন চালান। শিডিউল করুন, রিয়েল-টাইম রিপোর্ট দেখুন।"
      bullets={[
        "CSV/Excel ইম্পোর্ট, আনলিমিটেড কন্টাক্ট গ্রুপ",
        "{name}, {order_id} ইত্যাদি ডায়নামিক ভেরিয়েবল",
        "ক্যাম্পেইন শিডিউলিং ও অটো-রিট্রাই",
        "লাইভ ডেলিভারি ও ফেইলিউর রিপোর্ট",
      ]}
      visual={
        <div className="relative">
          <div className="absolute -inset-6 -z-10 bg-[radial-gradient(60%_60%_at_50%_50%,color-mix(in_oklab,var(--primary)_18%,transparent)_0%,transparent_70%)] blur-2xl" />
          <div className="relative gradient-border rounded-2xl card-elevated border border-border/60 p-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/15 text-primary">
                  <Send className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-semibold">ক্যাম্পেইন: ঈদ অফার ২০২৬</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> Running
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Stat label="মোট" value="১২,৪৮৯" />
              <Stat label="ডেলিভার্ড" value="১১,৯২২" accent />
              <Stat label="ফেইলড" value="৬৭" />
            </div>
            <div className="mt-6">
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-primary via-primary to-[color:var(--color-gold)] shadow-[0_0_20px_color-mix(in_oklab,var(--primary)_60%,transparent)]" />
                <div className="absolute inset-0 -translate-x-full animate-auth-beam bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">৮৮% সম্পন্ন</span>
                <span>~৩ মিনিট বাকি</span>
              </div>
            </div>
            {/* Mini chart */}
            <div className="mt-6 flex h-20 items-end justify-between gap-1">
              {[35, 52, 48, 70, 64, 82, 95, 88, 72, 90, 78, 96].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm bg-gradient-to-t from-primary/30 to-primary"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="mt-2 text-[10px] text-muted-foreground">শেষ ১২ মিনিটে throughput</div>
            <div className="mt-5 rounded-lg border border-border/70 bg-secondary/40 p-3 text-xs">
              <div className="text-muted-foreground">টেমপ্লেট প্রিভিউ</div>
              <div className="mt-1 text-foreground">
                আসসালামু আলাইকুম <span className="font-semibold text-primary">{"{name}"}</span>, ঈদ উপলক্ষে সকল পণ্যে ৫০% ছাড়!
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 transition ${accent ? "border-primary/30 bg-primary/5" : "border-border/60 bg-background"}`}>
      <div className={`font-display text-xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

/* ---------------- Plugin Section ---------------- */
function PluginSection() {
  const statuses = [
    { k: "Pending", v: "WhatsApp পাঠানো হবে" },
    { k: "Processing", v: "WhatsApp পাঠানো হবে" },
    { k: "Completed", v: "WhatsApp পাঠানো হবে" },
    { k: "Cancelled", v: "WhatsApp পাঠানো হবে" },
  ];
  return (
    <FeatureSection
      id="plugin"
      reverse
      eyebrow="WordPress প্লাগইন"
      title={<>প্রতিটি WooCommerce অর্ডারে <span className="text-shimmer">অটো নোটিফিকেশন</span></>}
      description="মাত্র ৫ মিনিটে আপনার WordPress সাইটে প্লাগইন ইনস্টল করুন। প্রতিটি অর্ডার স্ট্যাটাস চেঞ্জে কাস্টমার এবং অ্যাডমিন — দু'জনেই অটোমেটিক হোয়াটসঅ্যাপ মেসেজ পাবেন।"
      bullets={[
        "৭টি অর্ডার স্ট্যাটাসে আলাদা টেমপ্লেট (Bangla ডিফল্ট)",
        "প্রতি স্ট্যাটাসে কাস্টম ডিলে — সেলস টিম কল-ব্যাকের জন্য",
        "অটো-আপডেট, লাইভ ড্যাশবোর্ড ও স্ট্যাটাস মনিটরিং",
        "ওয়ান-ক্লিক অ্যাক্টিভেশন, কোনো কোডিং দরকার নেই",
      ]}
      visual={
        <div className="relative">
          <div className="absolute -inset-6 -z-10 bg-[radial-gradient(60%_60%_at_50%_50%,color-mix(in_oklab,var(--color-gold)_15%,transparent)_0%,transparent_70%)] blur-2xl" />
          {/* Browser chrome */}
          <div className="overflow-hidden rounded-2xl border border-border card-elevated">
            <div className="flex items-center gap-1.5 border-b border-border/60 bg-secondary/60 px-3 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <div className="ml-3 flex-1 rounded-md bg-background px-3 py-1 text-[10px] text-muted-foreground">
                yoursite.com/wp-admin · WA Suite Plugin
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-2 border-b border-border/60 pb-4">
                <ShoppingCart className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">WooCommerce অর্ডার ফ্লো</span>
                <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">v1.0.9</span>
              </div>
              <div className="mt-4 space-y-2">
                {statuses.map((s, i) => (
                  <div
                    key={s.k}
                    className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/40 px-3 py-2.5 text-sm transition hover:border-primary/40 hover:bg-accent/40 animate-ticker"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      <span className="font-medium text-foreground">{s.k}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs text-success">
                      {s.v} <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-lg border border-[color:var(--color-gold)]/30 bg-gradient-to-br from-primary/8 to-[color:var(--color-gold)]/10 p-3 text-xs leading-relaxed text-foreground">
                "প্রিয় রহিম, আপনার অর্ডার #১২৩৪ আমরা পেয়েছি। মোট: ৳১,২০০।
                <span className="font-semibold text-primary"> আমাদের সেলস টিম কিছুক্ষণের মধ্যে আপনাকে কল করবে।</span>"
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
}

/* ---------------- Protection Section ---------------- */
function ProtectionSection() {
  const layers = [
    { icon: Shield, t: "রিসিপিয়েন্ট কুলডাউন", d: "একই নম্বরে নির্দিষ্ট সময়ের আগে দ্বিতীয় মেসেজ যাবে না।" },
    { icon: Lock, t: "ডুপ্লিকেট সাপ্রেশন", d: "একই মেসেজ দ্বিতীয়বার পাঠানো অটো ব্লক হয়।" },
    { icon: Zap, t: "হিউম্যান-লাইক ডিলে", d: "র‍্যান্ডম জিটার যোগ করে বট প্যাটার্ন এড়ানো হয়।" },
    { icon: BarChart3, t: "রেট লিমিট", d: "প্রতি মিনিট ও ঘণ্টা ভিত্তিক স্মার্ট লিমিট।" },
    { icon: Users, t: "ব্লকড নাম্বার লিস্ট", d: "প্রতি ব্র্যান্ডের জন্য সেফ-লিস্ট ম্যানেজমেন্ট।" },
    { icon: Globe, t: "ডিভাইস হেলথ গেট", d: "ডিসকানেক্টেড ডিভাইসে মেসেজ যায় না।" },
  ];
  return (
    <section id="protection" className="relative overflow-hidden py-20 sm:py-28">
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/40 via-background to-background" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-dots-soft opacity-50" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <Shield className="h-3 w-3" />
            এক্সট্রিম ব্যান প্রোটেকশন
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl">
            আপনার নাম্বার নিরাপদ। <span className="text-shimmer">ব্যান বা রেস্ট্রিকশন নেই।</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            আমাদের ৬-লেয়ার সেফটি ইঞ্জিন প্রতিটি মেসেজ পাঠানোর আগে চেক করে — তাই হোয়াটসঅ্যাপ আপনাকে কখনই বট হিসাবে চিহ্নিত করবে না।
          </p>
        </div>

        {/* Central shield visualization */}
        <div className="relative mx-auto mt-14 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {layers.map((l, i) => (
            <div
              key={l.t}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-primary/10 to-[color:var(--color-gold)]/10 opacity-0 blur-2xl transition group-hover:opacity-100" />
              <div className="relative">
                <div className="inline-grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-[color:var(--color-gold)]/20 text-primary ring-1 ring-primary/20">
                  <l.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <h3 className="font-display text-lg font-semibold">{l.t}</h3>
                  <span className="text-[10px] font-bold text-muted-foreground/60">0{i + 1}</span>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{l.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Testimonials ---------------- */
function Testimonials() {
  const items = [
    {
      name: "তানভীর আহমেদ",
      role: "প্রতিষ্ঠাতা · ঢাকা ফ্যাশন",
      text: "এক মাসেই আমাদের রিপিট অর্ডার ৩৫% বেড়েছে। WooCommerce-এর সাথে ইন্টিগ্রেশন একদম জাদুর মতো।",
      tag: "ই‑কমার্স",
    },
    {
      name: "ফারজানা রহমান",
      role: "মার্কেটিং হেড · BD Mart",
      text: "অফিসিয়াল API চেষ্টা করে দেখেছি — ১০ গুণ বেশি দাম, ৪ সপ্তাহ লাগে। WA Suite-এ এক দিনেই চালু।",
      tag: "রিটেইল",
    },
    {
      name: "সাদিক হাসান",
      role: "অপস ম্যানেজার · TechBazaar",
      text: "৬-লেয়ার প্রোটেকশনের পর থেকে আমাদের একটাও নম্বর ব্যান হয়নি। এই কনফিডেন্স টাকার চেয়েও দামি।",
      tag: "ইলেকট্রনিক্স",
    },
  ];
  return (
    <section className="border-y border-border/60 bg-secondary/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full border border-[color:var(--color-gold)]/40 bg-[color:var(--color-gold-soft)]/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-emerald-deep)]">
            গ্রাহকদের কথা
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            ২,৫০০+ ব্যবসা ইতিমধ্যে <span className="text-shimmer">আমাদের সাথে</span>
          </h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {items.map((t) => (
            <div key={t.name} className="relative rounded-2xl border border-border bg-card p-7 shadow-sm transition hover:shadow-lg hover:shadow-primary/5">
              <Quote className="absolute -top-3 left-6 h-7 w-7 rotate-180 fill-[color:var(--color-gold)] text-[color:var(--color-gold)]" />
              <div className="flex items-center gap-0.5 text-[color:var(--color-gold)]">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">"{t.text}"</p>
              <div className="mt-6 flex items-center gap-3 border-t border-border/60 pt-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-primary to-[color:var(--color-emerald-deep)] text-sm font-bold text-primary-foreground">
                  {t.name.charAt(0)}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">{t.tag}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Pricing comparison ---------------- */
function PricingSection() {
  const rows = [
    { f: "প্রতি মেসেজ খরচ", ours: "৳০.১৫", api: "৳১.৫০ – ৳৩.০০" },
    { f: "মাসিক ফি", ours: "৳৪৯৯ থেকে", api: "$XXX + ডেভেলপার ফি" },
    { f: "সেটআপ সময়", ours: "৫ মিনিট", api: "২–৪ সপ্তাহ" },
    { f: "বিজনেস ভেরিফিকেশন", ours: "প্রয়োজন নেই", api: "বাধ্যতামূলক" },
    { f: "ফেসবুক বিজনেস ম্যানেজার", ours: "প্রয়োজন নেই", api: "বাধ্যতামূলক" },
    { f: "টেমপ্লেট অনুমোদন", ours: "ইনস্ট্যান্ট", api: "২৪–৪৮ ঘণ্টা" },
    { f: "WooCommerce ইন্টিগ্রেশন", ours: "বিল্ট-ইন প্লাগইন", api: "কাস্টম ডেভেলপমেন্ট" },
    { f: "বাংলায় সাপোর্ট", ours: "২৪/৭", api: "ইংরেজি, লিমিটেড" },
  ];
  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-[color:var(--color-gold)]/40 bg-[color:var(--color-gold-soft)]/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[color:var(--color-emerald-deep)]">
            <DollarSign className="mr-1 h-3 w-3" /> অবিশ্বাস্য কম দাম
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl">
            অফিসিয়াল WhatsApp API-এর তুলনায় <span className="text-shimmer">১০x সস্তা</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            একই ডেলিভারি, একই রিচ — কিন্তু কয়েকগুণ কম খরচে। ছোট ব্যবসার জন্যও এখন আফোর্ডেবল।
          </p>
        </div>

        <div className="relative mx-auto mt-14 max-w-4xl">
          <div className="absolute -inset-4 -z-10 bg-[radial-gradient(50%_60%_at_50%_50%,color-mix(in_oklab,var(--primary)_18%,transparent)_0%,transparent_70%)] blur-2xl" />
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
            <div className="grid grid-cols-3 border-b border-border bg-secondary/40 text-sm font-semibold">
              <div className="p-5 text-muted-foreground">তুলনা</div>
              <div className="relative p-5 text-center text-foreground">
                <div className="absolute inset-x-3 -top-2 mx-auto h-1 w-12 rounded-full bg-gradient-to-r from-primary to-[color:var(--color-gold)]" />
                <div className="flex items-center justify-center gap-1.5">
                  <span className="grid h-5 w-5 place-items-center rounded-md bg-primary text-primary-foreground">
                    <MessageSquare className="h-3 w-3" />
                  </span>
                  WA Suite
                  <span className="rounded-full bg-[color:var(--color-gold)]/20 px-1.5 py-0.5 text-[9px] font-bold text-[color:var(--color-emerald-deep)]">
                    BEST
                  </span>
                </div>
              </div>
              <div className="p-5 text-center text-muted-foreground">WhatsApp Official API</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.f}
                className={`grid grid-cols-3 text-sm ${i % 2 === 0 ? "bg-background" : "bg-secondary/20"}`}
              >
                <div className="border-b border-border/50 p-4 text-muted-foreground">{r.f}</div>
                <div className="relative border-x border-primary/15 border-b border-b-border/50 bg-primary/[0.04] p-4 text-center font-semibold text-primary">
                  {r.ours}
                </div>
                <div className="border-b border-border/50 p-4 text-center text-muted-foreground">{r.api}</div>
              </div>
            ))}
            <div className="grid grid-cols-3 bg-gradient-to-r from-primary/10 via-[color:var(--color-gold)]/10 to-primary/10 text-sm font-bold">
              <div className="p-5 text-foreground">মোট সঞ্চয়</div>
              <div className="p-5 text-center">
                <span className="rounded-full bg-primary px-3 py-1 text-primary-foreground">৮৫–৯৫%</span>
              </div>
              <div className="p-5 text-center text-muted-foreground">—</div>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/auth"
            className="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-primary to-[color:var(--color-emerald-deep)] px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_20px_50px_-15px_var(--primary)] transition hover:shadow-[0_25px_60px_-15px_var(--primary)]"
          >
            এখনই অ্যাকাউন্ট খুলুন <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Final CTA ---------------- */
function FinalCta() {
  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-[color:var(--color-gold)]/30 bg-gradient-to-br from-[color:var(--color-emerald-deep)] via-primary to-[color:var(--color-emerald-deep)] p-10 text-center text-primary-foreground shadow-2xl sm:p-16">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(50%_70%_at_85%_15%,color-mix(in_oklab,var(--color-gold)_35%,transparent)_0%,transparent_60%)]" />
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(45%_60%_at_10%_90%,color-mix(in_oklab,var(--primary-glow)_45%,transparent)_0%,transparent_60%)]" />
          <div aria-hidden className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div aria-hidden className="absolute -inset-x-10 top-1/3 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] backdrop-blur">
              <Sparkles className="h-3 w-3" /> লিমিটেড অফার
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl">
              আজই শুরু করুন। প্রথম{" "}
              <span className="bg-gradient-to-r from-[color:var(--color-gold-soft)] to-[color:var(--color-gold)] bg-clip-text text-transparent">
                ১০০ মেসেজ ফ্রি
              </span>
              ।
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
              ক্রেডিট কার্ড লাগবে না। ৫ মিনিটে সেটআপ, বাংলায় সাপোর্ট।
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/auth"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg bg-gradient-to-br from-[color:var(--color-gold-soft)] to-[color:var(--color-gold)] px-6 py-3 text-sm font-bold text-[color:var(--color-emerald-deep)] shadow-xl shadow-black/20 transition hover:scale-[1.02]"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition duration-700 group-hover:translate-x-full" />
                <span className="relative">ফ্রি অ্যাকাউন্ট খুলুন</span>
                <ArrowRight className="relative h-4 w-4" />
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                আরো জানুন
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Footer ---------------- */
function Footer() {
  return (
    <footer className="border-t border-border/60 bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-[color:var(--color-emerald-deep)] text-primary-foreground shadow-md">
                <MessageSquare className="h-4 w-4" />
              </span>
              <span className="font-display text-lg font-bold">WA Suite</span>
              <span className="text-xs text-muted-foreground">by Hoster Camp</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              বাংলাদেশের জন্য সবচেয়ে সাশ্রয়ী হোয়াটসঅ্যাপ বাল্ক মেসেজিং প্ল্যাটফর্ম। সহজ, নিরাপদ এবং নির্ভরযোগ্য।
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">প্রোডাক্ট</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><a href="#bulk" className="hover:text-foreground">বাল্ক মেসেজ</a></li>
              <li><a href="#plugin" className="hover:text-foreground">WordPress প্লাগইন</a></li>
              <li><a href="#protection" className="hover:text-foreground">ব্যান প্রোটেকশন</a></li>
              <li><a href="#pricing" className="hover:text-foreground">প্রাইসিং</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">অ্যাকাউন্ট</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li><Link to="/auth" className="hover:text-foreground">লগইন</Link></li>
              <li><Link to="/auth" className="hover:text-foreground">সাইন আপ</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} WA Suite. সর্বস্বত্ব সংরক্ষিত।
          </p>
          <p className="text-xs text-muted-foreground">Made with ♥ in Bangladesh</p>
        </div>
      </div>
    </footer>
  );
}
