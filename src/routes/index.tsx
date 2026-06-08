import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Send, Shield, Zap, DollarSign, ShoppingCart, CheckCircle2, ArrowRight,
  MessageSquare, Sparkles, Users, BarChart3, Lock, Globe,
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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-[color:var(--color-emerald-deep)] text-primary-foreground shadow-[0_8px_24px_-12px_var(--primary)]">
            <MessageSquare className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">WA Suite</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#bulk" className="hover:text-foreground">বাল্ক মেসেজ</a>
          <a href="#plugin" className="hover:text-foreground">WordPress প্লাগইন</a>
          <a href="#protection" className="hover:text-foreground">ব্যান প্রোটেকশন</a>
          <a href="#pricing" className="hover:text-foreground">প্রাইসিং</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="hidden rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground sm:inline-flex"
          >
            লগইন
          </Link>
          <Link
            to="/auth"
            className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3.5 py-2 text-sm font-semibold text-background shadow-sm transition hover:opacity-90"
          >
            শুরু করুন <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ---------------- Hero ---------------- */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,color-mix(in_oklab,var(--primary)_22%,transparent)_0%,transparent_70%)]"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-emerald-deep)_8%,transparent)_0%,transparent_100%)]"
      />
      <div className="mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--color-gold)]/40 bg-[color:var(--color-gold-soft)]/30 px-3 py-1 text-xs font-semibold text-[color:var(--color-emerald-deep)]">
            <Sparkles className="h-3.5 w-3.5" />
            বাংলাদেশের #১ হোয়াটসঅ্যাপ মেসেজিং প্ল্যাটফর্ম
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl">
            হাজারো কাস্টমারের কাছে{" "}
            <span className="bg-gradient-to-r from-primary via-[color:var(--color-emerald-deep)] to-[color:var(--color-gold)] bg-clip-text text-transparent">
              এক ক্লিকেই
            </span>{" "}
            হোয়াটসঅ্যাপ মেসেজ
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            বাল্ক প্রমোশন, WooCommerce অর্ডার নোটিফিকেশন, এবং এক্সট্রিম ব্যান প্রোটেকশন —
            অফিসিয়াল API-এর তুলনায় <strong className="text-foreground">১০x কম খরচে</strong>।
            ছোট থেকে বড়, প্রতিটি বিজনেসের জন্য।
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_30px_-12px_var(--primary)] transition hover:opacity-95"
            >
              ফ্রি ট্রায়াল শুরু করুন <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-accent"
            >
              প্রাইসিং দেখুন
            </a>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            ক্রেডিট কার্ড ছাড়াই · ৫ মিনিটে সেটআপ · বাংলায় সাপোর্ট
          </p>
        </div>

        {/* Mock chat preview */}
        <div className="mx-auto mt-14 max-w-4xl">
          <div className="rounded-2xl border border-border/60 bg-card p-2 shadow-2xl shadow-[color:var(--primary)]/10">
            <div className="rounded-xl bg-gradient-to-br from-[color:var(--color-emerald-deep)] to-primary p-6 sm:p-10">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { name: "রহিম", text: "আপনার অর্ডার #১২৩৪ গ্রহণ করা হয়েছে।", time: "এখন" },
                  { name: "করিম", text: "ঈদ অফার! ৫০% ছাড়, আজই অর্ডার করুন।", time: "১ মিনিট" },
                  { name: "ফাতিমা", text: "আপনার পণ্য ডেলিভারি হয়েছে। ধন্যবাদ!", time: "২ মিনিট" },
                ].map((m) => (
                  <div key={m.name} className="rounded-xl bg-white/95 p-4 text-left shadow-md">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-700">{m.name}</span>
                      <span>{m.time}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-800">{m.text}</p>
                    <div className="mt-2 flex justify-end text-[10px] text-primary">✓✓ Delivered</div>
                  </div>
                ))}
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
    <section className="border-y border-border/60 bg-secondary/40">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:grid-cols-4 sm:px-6">
        {stats.map((s) => (
          <div key={s.label} className="text-center">
            <div className="font-display text-3xl font-bold text-foreground sm:text-4xl">{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Feature section helper ---------------- */
function FeatureSection(props: {
  id: string;
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  bullets: string[];
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <section id={props.id} className="border-b border-border/60 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className={`grid items-center gap-12 lg:grid-cols-2 ${props.reverse ? "lg:[&>div:first-child]:order-2" : ""}`}>
          <div>
            <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
              {props.eyebrow}
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {props.title}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              {props.description}
            </p>
            <ul className="mt-6 space-y-3">
              {props.bullets.map((b) => (
                <li key={b} className="flex gap-3 text-sm">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span className="text-foreground/90">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>{props.visual}</div>
        </div>
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
      title={<>একসাথে হাজারো কাস্টমারকে <span className="text-primary">হোয়াটসঅ্যাপ</span> পাঠান</>}
      description="CSV আপলোড করুন, কন্টাক্ট গ্রুপ তৈরি করুন, এবং পার্সোনালাইজড টেমপ্লেট দিয়ে ক্যাম্পেইন চালান। শিডিউল করুন, রিয়েল-টাইম রিপোর্ট দেখুন।"
      bullets={[
        "CSV/Excel ইম্পোর্ট, আনলিমিটেড কন্টাক্ট গ্রুপ",
        "{name}, {order_id} ইত্যাদি ডায়নামিক ভেরিয়েবল",
        "ক্যাম্পেইন শিডিউলিং ও অটো-রিট্রাই",
        "লাইভ ডেলিভারি ও ফেইলিউর রিপোর্ট",
      ]}
      visual={
        <div className="relative rounded-2xl border border-border bg-card p-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">ক্যাম্পেইন: ঈদ অফার</span>
            </div>
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success">Running</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Stat label="মোট" value="১২,৪৮৯" />
            <Stat label="ডেলিভার্ড" value="১১,৯২২" accent />
            <Stat label="ফেইলড" value="৬৭" />
          </div>
          <div className="mt-6">
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-[88%] rounded-full bg-gradient-to-r from-primary to-[color:var(--color-gold)]" />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>৮৮% সম্পন্ন</span>
              <span>~৩ মিনিট বাকি</span>
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-border/70 bg-secondary/40 p-3 text-xs">
            <div className="text-muted-foreground">টেমপ্লেট প্রিভিউ</div>
            <div className="mt-1 text-foreground">
              আসসালামু আলাইকুম <span className="text-primary">{"{name}"}</span>, ঈদ উপলক্ষে সকল পণ্যে ৫০% ছাড়!
            </div>
          </div>
        </div>
      }
    />
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background p-3">
      <div className={`font-display text-xl font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

/* ---------------- Plugin Section ---------------- */
function PluginSection() {
  const statuses = [
    { k: "Pending", v: "✓" },
    { k: "Processing", v: "✓" },
    { k: "Completed", v: "✓" },
    { k: "Cancelled", v: "✓" },
  ];
  return (
    <FeatureSection
      id="plugin"
      reverse
      eyebrow="WordPress প্লাগইন"
      title={<>প্রতিটি WooCommerce অর্ডারে <span className="text-primary">অটো নোটিফিকেশন</span></>}
      description="মাত্র ৫ মিনিটে আপনার WordPress সাইটে প্লাগইন ইনস্টল করুন। প্রতিটি অর্ডার স্ট্যাটাস চেঞ্জে কাস্টমার এবং অ্যাডমিন — দু'জনেই অটোমেটিক হোয়াটসঅ্যাপ মেসেজ পাবেন।"
      bullets={[
        "৭টি অর্ডার স্ট্যাটাসে আলাদা টেমপ্লেট (Bangla ডিফল্ট)",
        "প্রতি স্ট্যাটাসে কাস্টম ডিলে — সেলস টিম কল-ব্যাকের জন্য",
        "অটো-আপডেট, লাইভ ড্যাশবোর্ড ও স্ট্যাটাস মনিটরিং",
        "ওয়ান-ক্লিক অ্যাক্টিভেশন, কোনো কোডিং দরকার নেই",
      ]}
      visual={
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl">
          <div className="flex items-center gap-2 border-b border-border/60 pb-4">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">WooCommerce অর্ডার ফ্লো</span>
          </div>
          <div className="mt-4 space-y-2">
            {statuses.map((s) => (
              <div key={s.k} className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/40 px-3 py-2.5 text-sm">
                <span className="font-medium text-foreground">{s.k}</span>
                <span className="inline-flex items-center gap-1 text-xs text-success">
                  WhatsApp পাঠানো হবে <CheckCircle2 className="h-3.5 w-3.5" />
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-gradient-to-br from-primary/10 to-[color:var(--color-gold)]/10 p-3 text-xs text-foreground">
            "প্রিয় রহিম, আপনার অর্ডার #১২৩৪ আমরা পেয়েছি। মোট: ৳১,২০০।
            <span className="text-primary"> আমাদের সেলস টিম কিছুক্ষণের মধ্যে আপনাকে কল করবে।</span>"
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
    <section id="protection" className="border-b border-border/60 bg-gradient-to-b from-secondary/30 to-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
            এক্সট্রিম ব্যান প্রোটেকশন
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            আপনার নাম্বার নিরাপদ। <span className="text-primary">ব্যান বা রেস্ট্রিকশন নেই।</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            আমাদের ৬-লেয়ার সেফটি ইঞ্জিন প্রতিটি মেসেজ পাঠানোর আগে চেক করে — তাই হোয়াটসঅ্যাপ আপনাকে কখনই বট হিসাবে চিহ্নিত করবে না।
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {layers.map((l) => (
            <div key={l.t} className="group rounded-2xl border border-border bg-card p-6 transition hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-[color:var(--color-gold)]/15 text-primary">
                <l.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{l.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{l.d}</p>
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
    <section id="pricing" className="border-b border-border/60 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full border border-[color:var(--color-gold)]/40 bg-[color:var(--color-gold-soft)]/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[color:var(--color-emerald-deep)]">
            <DollarSign className="mr-1 h-3.5 w-3.5" /> অবিশ্বাস্য কম দাম
          </span>
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            অফিসিয়াল WhatsApp API-এর তুলনায় <span className="text-primary">১০x সস্তা</span>
          </h2>
          <p className="mt-4 text-muted-foreground">
            একই ডেলিভারি, একই রিচ — কিন্তু কয়েকগুণ কম খরচে। ছোট ব্যবসার জন্যও এখন আফোর্ডেবল।
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          <div className="grid grid-cols-3 border-b border-border bg-secondary/40 text-sm font-semibold">
            <div className="p-4 text-muted-foreground">তুলনা</div>
            <div className="p-4 text-center text-foreground">
              <div className="flex items-center justify-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" /> WA Suite
              </div>
            </div>
            <div className="p-4 text-center text-muted-foreground">WhatsApp Official API</div>
          </div>
          {rows.map((r, i) => (
            <div
              key={r.f}
              className={`grid grid-cols-3 text-sm ${i % 2 === 0 ? "bg-background" : "bg-secondary/20"}`}
            >
              <div className="border-b border-border/50 p-4 text-muted-foreground">{r.f}</div>
              <div className="border-b border-border/50 p-4 text-center font-semibold text-primary">{r.ours}</div>
              <div className="border-b border-border/50 p-4 text-center text-muted-foreground">{r.api}</div>
            </div>
          ))}
          <div className="grid grid-cols-3 bg-gradient-to-r from-primary/5 to-[color:var(--color-gold)]/5 text-sm font-bold">
            <div className="p-4 text-foreground">মোট সঞ্চয়</div>
            <div className="p-4 text-center text-primary">৮৫–৯৫%</div>
            <div className="p-4 text-center text-muted-foreground">—</div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_30px_-12px_var(--primary)] hover:opacity-95"
          >
            এখনই অ্যাকাউন্ট খুলুন <ArrowRight className="h-4 w-4" />
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
        <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-[color:var(--color-emerald-deep)] via-primary to-[color:var(--color-emerald-deep)] p-10 text-center text-primary-foreground shadow-2xl sm:p-16">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(40%_60%_at_80%_20%,color-mix(in_oklab,var(--color-gold)_25%,transparent)_0%,transparent_60%)]"
          />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              আজই শুরু করুন। প্রথম ১০০ মেসেজ ফ্রি।
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
              ক্রেডিট কার্ড লাগবে না। ৫ মিনিটে সেটআপ, বাংলায় সাপোর্ট।
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-md bg-[color:var(--color-gold)] px-5 py-3 text-sm font-bold text-[color:var(--color-emerald-deep)] shadow-lg hover:brightness-105"
              >
                ফ্রি অ্যাকাউন্ট খুলুন <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-md border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/15"
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
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <MessageSquare className="h-4 w-4" />
            </span>
            <span className="font-display font-bold">WA Suite</span>
            <span className="text-xs text-muted-foreground">by Hoster Camp</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} WA Suite. সর্বস্বত্ব সংরক্ষিত।
          </p>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <a href="#bulk" className="hover:text-foreground">ফিচার</a>
            <a href="#pricing" className="hover:text-foreground">প্রাইসিং</a>
            <Link to="/auth" className="hover:text-foreground">লগইন</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
