import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PlayCircle, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";

export const Route = createFileRoute("/_authenticated/tutorials")({
  head: () => ({
    meta: [
      { title: "Tutorials — WA Suite" },
      { name: "description", content: "Video tutorials and user guide to help you use the panel." },
    ],
  }),
  component: TutorialsPage,
});

type Tutorial = {
  id: string;        // YouTube video ID (e.g. "dQw4w9WgXcQ")
  title: string;
  description?: string;
  category: string;
};

// To add a new tutorial: paste the YouTube video ID (the part after v=) and fill in the rest.
const TUTORIALS: Tutorial[] = [
  {
    id: "dQw4w9WgXcQ",
    title: "Getting Started with WA Suite",
    description: "Overview of the dashboard and what each section does.",
    category: "Getting Started",
  },
  {
    id: "dQw4w9WgXcQ",
    title: "Linking Your First WhatsApp Device",
    description: "Step-by-step QR linking, relink, and troubleshooting.",
    category: "Devices",
  },
  {
    id: "dQw4w9WgXcQ",
    title: "Sending a Campaign",
    description: "Create contact groups, draft a message, and launch a campaign.",
    category: "Campaigns",
  },
  {
    id: "dQw4w9WgXcQ",
    title: "Reading Reports & Message Logs",
    description: "Understand delivery rates, failures, and per-brand stats.",
    category: "Reports",
  },
];

function TutorialsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(TUTORIALS.map((t) => t.category)))],
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TUTORIALS.filter((t) => {
      if (category !== "All" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [query, category]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tutorials & User Guide"
        description="Watch short video walkthroughs to get the most out of the panel."
        icon={PlayCircle}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tutorials…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Badge
              key={c}
              variant={category === c ? "default" : "secondary"}
              className="cursor-pointer"
              onClick={() => setCategory(c)}
            >
              {c}
            </Badge>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No tutorials match your search.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t, i) => (
            <Card key={`${t.id}-${i}`} className="overflow-hidden">
              <div className="aspect-video w-full bg-black">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${t.id}?rel=0`}
                  title={t.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <CardContent className="space-y-1.5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-snug">{t.title}</h3>
                  <Badge variant="outline" className="shrink-0 text-[10px]">{t.category}</Badge>
                </div>
                {t.description && (
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
