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
        
        <TrustStrip />
        <BulkSection />
        <PluginSection />
        <ProtectionSection />
        <Testimonials />
        <PricingSection />
        <CompareSection />
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
          <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_10px_30px_-12px_var(--primary)]">
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
          <a
            href="#pricing"
            className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-md bg-foreground px-3.5 py-2 text-sm font-semibold text-background shadow-sm transition hover:opacity-95"
          >
            <span className="relative z-10">অর্ডার করুন</span>
            <ArrowRight className="relative z-10 h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </a>
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
        {/* Centered content */}
        <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center">
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
          <h1 className="text-balance font-display text-4xl font-extrabold leading-[1.15] tracking-tight text-[color:var(--color-emerald-deep)] sm:text-5xl md:text-6xl">
            হাজারো কাস্টমারের কাছে{" "}
            <span className="text-primary">এক ক্লিকেই</span>{" "}
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
            <a
              href="#pricing"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-primary px-8 py-4 text-base font-bold text-primary-foreground shadow-xl shadow-primary/25 transition-all hover:scale-[1.03] hover:bg-[color:var(--color-emerald-deep)] active:scale-95"
            >
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition duration-700 group-hover:translate-x-full" />
              <span className="relative">অর্ডার করুন এখনই</span>
              <ArrowRight className="relative h-5 w-5 transition group-hover:translate-x-0.5" />
            </a>
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
              "আনলিমিটেড মেসেজ",
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
                <span className="text-foreground">
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
                <div className="h-full w-[88%] rounded-full bg-primary shadow-[0_0_20px_color-mix(in_oklab,var(--primary)_60%,transparent)]" />
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
              <div className="mt-5 rounded-lg border border-primary/20 bg-primary/8 p-3 text-xs leading-relaxed text-foreground">
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
    { icon: Shield, t: "অ্যান্টি-ব্যান শিল্ড", d: "মাল্টি-লেয়ার সুরক্ষা সিস্টেম আপনার নম্বর নিরাপদ রাখে।" },
    { icon: Lock, t: "স্মার্ট সেফগার্ড", d: "অ্যাডভান্সড অ্যালগরিদম ঝুঁকিপূর্ণ প্যাটার্ন প্রতিরোধ করে।" },
    { icon: Zap, t: "ন্যাচারাল বিহেভিয়ার", d: "মানুষের মতো আচরণ অনুকরণ করে নিরাপদ ডেলিভারি।" },
    { icon: BarChart3, t: "ইন্টেলিজেন্ট থ্রটলিং", d: "ডায়নামিক স্পিড কন্ট্রোল প্রতিটি ক্যাম্পেইনে।" },
    { icon: Users, t: "সেফ-লিস্ট ম্যানেজমেন্ট", d: "অপ্ট-আউট ও ব্লক লিস্ট স্বয়ংক্রিয়ভাবে মেনে চলে।" },
    { icon: Globe, t: "রিয়েল-টাইম মনিটরিং", d: "অ্যাকাউন্ট হেলথ ২৪/৭ পর্যবেক্ষণে থাকে।" },
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
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 opacity-0 blur-2xl transition group-hover:opacity-100" />
              <div className="relative">
                <div className="inline-grid h-12 w-12 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/20">
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
                <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
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

/* ---------------- Pricing plans ---------------- */
function PricingSection() {
  const plans = [
    {
      name: "স্টার্টার",
      price: "৬০০",
      tagline: "ছোট ব্যবসা ও সিঙ্গেল স্টোরের জন্য পারফেক্ট",
      features: [
        "আনলিমিটেড মেসেজ",
        "১ নাম্বার / ডিভাইস",
        "আনলিমিটেড এজেন্ট",
        "১ WordPress প্লাগইন লাইসেন্স",
        "৬-লেয়ার অ্যান্টি-ব্যান প্রোটেকশন",
        "বাংলায় ২৪/৭ সাপোর্ট",
      ],
      highlighted: false,
      cta: "প্ল্যান নিন",
    },
    {
      name: "প্রো",
      price: "৮০০",
      tagline: "একাধিক ব্র্যান্ড ও বড় টিমের জন্য",
      features: [
        "আনলিমিটেড মেসেজ",
        "৩ নাম্বার / ডিভাইস",
        "আনলিমিটেড এজেন্ট",
        "৩ WordPress প্লাগইন লাইসেন্স",
        "৬-লেয়ার অ্যান্টি-ব্যান প্রোটেকশন",
        "প্রায়োরিটি সাপোর্ট",
      ],
      highlighted: true,
      cta: "প্রো নিন",
    },
  ];

  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <DollarSign className="mr-1 h-3 w-3" /> সহজ ও স্বচ্ছ প্রাইসিং
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl">
            আপনার জন্য সেরা <span className="text-primary">প্ল্যান</span> বেছে নিন
          </h2>
          <p className="mt-4 text-muted-foreground">
            কোনো লুকানো চার্জ নেই। প্রতিটি প্ল্যানে আনলিমিটেড মেসেজ ও আনলিমিটেড এজেন্ট অন্তর্ভুক্ত।
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl gap-6 md:grid-cols-2">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative overflow-hidden rounded-3xl border bg-card p-8 shadow-lg transition hover:shadow-2xl sm:p-10 ${
                p.highlighted
                  ? "border-primary/40 ring-2 ring-primary/30"
                  : "border-border"
              }`}
            >
              {p.highlighted && (
                <span className="absolute right-6 top-6 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                  জনপ্রিয়
                </span>
              )}
              <h3 className="font-display text-2xl font-bold text-foreground">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-5xl font-extrabold text-foreground">৳{p.price}</span>
                <span className="text-sm font-medium text-muted-foreground">/মাস</span>
              </div>
              <ul className="mt-8 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#order"
                className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-bold transition ${
                  p.highlighted
                    ? "bg-primary text-primary-foreground hover:bg-[color:var(--color-emerald-deep)]"
                    : "border-2 border-border bg-background text-foreground hover:border-primary hover:text-primary"
                }`}
              >
                অর্ডার করুন <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-border bg-secondary/30 p-6 text-center">
          <p className="text-sm font-semibold text-foreground">অ্যাড-অন চার্জ</p>
          <p className="mt-2 text-sm text-muted-foreground">
            অতিরিক্ত ডিভাইস <span className="font-bold text-foreground">৳২০০</span> প্রতি ডিভাইস ·
            অতিরিক্ত WordPress প্লাগইন লাইসেন্স <span className="font-bold text-foreground">৳১৫০</span> প্রতি লাইসেন্স
          </p>
        </div>
      </div>
    </section>
  );
}


/* ---------------- Compare with Official API ---------------- */
function CompareSection() {
  const rows = [
    { f: "প্রতি মেসেজ খরচ", ours: "অন্তর্ভুক্ত", api: "৳১.৫০ – ৳৩.০০" },
    { f: "মাসিক ফি", ours: "৳৬০০ থেকে", api: "$XXX + ডেভেলপার ফি" },
    { f: "সেটআপ সময়", ours: "৫ মিনিট", api: "২–৪ সপ্তাহ" },
    { f: "বিজনেস ভেরিফিকেশন", ours: "প্রয়োজন নেই", api: "বাধ্যতামূলক" },
    { f: "ফেসবুক বিজনেস ম্যানেজার", ours: "প্রয়োজন নেই", api: "বাধ্যতামূলক" },
    { f: "টেমপ্লেট অনুমোদন", ours: "ইনস্ট্যান্ট", api: "২৪–৪৮ ঘণ্টা" },
    { f: "WooCommerce ইন্টিগ্রেশন", ours: "বিল্ট-ইন প্লাগইন", api: "কাস্টম ডেভেলপমেন্ট" },
    { f: "বাংলায় সাপোর্ট", ours: "২৪/৭", api: "ইংরেজি, লিমিটেড" },
  ];
  return (
    <section className="bg-secondary/30 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            <BarChart3 className="mr-1 h-3 w-3" /> তুলনা
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl">
            অফিসিয়াল WhatsApp API-এর তুলনায়{" "}
            <span className="text-primary">১০x সস্তা</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            একই ডেলিভারি, একই রিচ — কিন্তু কয়েকগুণ কম খরচে ও ঝামেলা ছাড়াই।
          </p>
        </div>

        <div className="relative mx-auto mt-14 max-w-4xl">
          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
            <div className="grid grid-cols-3 border-b border-border bg-secondary/50 text-sm font-semibold">
              <div className="p-5 text-muted-foreground">তুলনা</div>
              <div className="relative p-5 text-center text-foreground">
                <div className="absolute inset-x-3 -top-2 mx-auto h-1 w-12 rounded-full bg-primary" />
                <div className="flex items-center justify-center gap-1.5">
                  <span className="grid h-5 w-5 place-items-center rounded-md bg-primary text-primary-foreground">
                    <MessageSquare className="h-3 w-3" />
                  </span>
                  WA Suite
                  <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold text-primary">
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
                <div className="border-x border-primary/15 border-b border-b-border/50 bg-primary/[0.04] p-4 text-center font-semibold text-primary">
                  {r.ours}
                </div>
                <div className="border-b border-border/50 p-4 text-center text-muted-foreground">{r.api}</div>
              </div>
            ))}
            <div className="grid grid-cols-3 bg-primary/8 text-sm font-bold">
              <div className="p-5 text-foreground">মোট সঞ্চয়</div>
              <div className="p-5 text-center">
                <span className="rounded-full bg-primary px-3 py-1 text-primary-foreground">৮৫–৯৫%</span>
              </div>
              <div className="p-5 text-center text-muted-foreground">—</div>
            </div>
          </div>
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
        <div className="relative overflow-hidden rounded-3xl border border-[color:var(--color-gold)]/30 bg-[color:var(--color-emerald-deep)] p-10 text-center text-primary-foreground shadow-2xl sm:p-16">
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(50%_70%_at_85%_15%,color-mix(in_oklab,var(--color-gold)_35%,transparent)_0%,transparent_60%)]" />
          <div aria-hidden className="absolute inset-0 bg-[radial-gradient(45%_60%_at_10%_90%,color-mix(in_oklab,var(--primary-glow)_45%,transparent)_0%,transparent_60%)]" />
          <div aria-hidden className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div aria-hidden className="absolute -inset-x-10 top-1/3 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] backdrop-blur">
              <Sparkles className="h-3 w-3" /> অর্ডার করুন এখনই
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-5xl">
              ৬০০ টাকা থেকে শুরু।{" "}
              <span className="text-primary">
                আনলিমিটেড মেসেজ
              </span>
              ।
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
              ৫ মিনিটে সেটআপ, বাংলায় ২৪/৭ সাপোর্ট। কোনো লুকানো চার্জ নেই।
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="#pricing"
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg bg-[color:var(--color-gold)] px-6 py-3 text-sm font-bold text-[color:var(--color-emerald-deep)] shadow-xl shadow-black/20 transition hover:scale-[1.02]"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition duration-700 group-hover:translate-x-full" />
                <span className="relative">অর্ডার করুন এখনই</span>
                <ArrowRight className="relative h-4 w-4" />
              </a>
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
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-md">
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
              <li><a href="#pricing" className="hover:text-foreground">অর্ডার করুন</a></li>
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
