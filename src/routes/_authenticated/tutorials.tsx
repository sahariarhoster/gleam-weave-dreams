import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PlayCircle, Search, Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/layout/page-header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { upsertTutorial, deleteTutorial } from "@/lib/tutorials.functions";

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
  id: string;
  video_id: string;
  title: string;
  description: string | null;
  category: string;
  sort_order: number;
};

// Accepts a YouTube URL or raw video ID and returns the 11-char video ID.
function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.slice(1);
      if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
    }
    const v = url.searchParams.get("v");
    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && /^[A-Za-z0-9_-]{11}$/.test(last)) return last;
  } catch {
    // not a URL
  }
  return null;
}

function TutorialsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");
  const [editing, setEditing] = useState<Tutorial | null>(null);
  const [open, setOpen] = useState(false);

  const rolesQ = useQuery({
    queryKey: ["my-roles", user?.id ?? "anon"],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => r.role as string);
    },
  });
  const isOwner = (rolesQ.data ?? []).includes("owner");

  const tutorialsQ = useQuery<Tutorial[]>({
    queryKey: ["tutorials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tutorials")
        .select("id, video_id, title, description, category, sort_order")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Tutorial[];
    },
  });

  const tutorials = tutorialsQ.data ?? [];

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(tutorials.map((t) => t.category)))],
    [tutorials],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tutorials.filter((t) => {
      if (category !== "All" && t.category !== category) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [tutorials, query, category]);

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tutorials").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Tutorial deleted");
      qc.invalidateQueries({ queryKey: ["tutorials"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tutorials & User Guide"
        description="Watch short video walkthroughs to get the most out of the panel."
        icon={PlayCircle}
        actions={
          isOwner ? (
            <Button onClick={() => { setEditing(null); setOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Add Tutorial
            </Button>
          ) : undefined
        }
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
        {categories.length > 1 && (
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
        )}
      </div>

      {tutorialsQ.isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Loading tutorials…
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {tutorials.length === 0
              ? isOwner
                ? "No tutorials yet. Click 'Add Tutorial' to add your first video."
                : "No tutorials available yet. Please check back soon."
              : "No tutorials match your search."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <Card key={t.id} className="overflow-hidden">
              <div className="aspect-video w-full bg-black">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube.com/embed/${t.video_id}?rel=0`}
                  title={t.title}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold leading-snug break-words">{t.title}</h3>
                  <Badge variant="outline" className="shrink-0 text-[10px]">{t.category}</Badge>
                </div>
                {t.description && (
                  <p className="text-xs text-muted-foreground break-words">{t.description}</p>
                )}
                {isOwner && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" className="gap-1.5"
                      onClick={() => { setEditing(t); setOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-destructive"
                      disabled={deleteMut.isPending}
                      onClick={() => { if (confirm(`Delete "${t.title}"?`)) deleteMut.mutate(t.id); }}>
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TutorialDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["tutorials"] })}
      />
    </div>
  );
}

function TutorialDialog({
  open, onOpenChange, editing, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Tutorial | null;
  onSaved: () => void;
}) {
  const [videoInput, setVideoInput] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [sortOrder, setSortOrder] = useState(0);

  // Reset form when dialog opens
  useMemo(() => {
    if (open) {
      setVideoInput(editing?.video_id ?? "");
      setTitle(editing?.title ?? "");
      setDescription(editing?.description ?? "");
      setCategory(editing?.category ?? "General");
      setSortOrder(editing?.sort_order ?? 0);
    }
  }, [open, editing]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const videoId = extractVideoId(videoInput);
      if (!videoId) throw new Error("Invalid YouTube URL or video ID");
      if (!title.trim()) throw new Error("Title is required");
      const payload = {
        video_id: videoId,
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || "General",
        sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      };
      if (editing) {
        const { error } = await supabase.from("tutorials").update(payload).eq("id", editing.id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("tutorials").insert(payload);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Tutorial updated" : "Tutorial added");
      onSaved();
      onOpenChange(false);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Tutorial" : "Add Tutorial"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>YouTube URL or Video ID</Label>
            <Input
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              placeholder="https://youtu.be/dQw4w9WgXcQ or dQw4w9WgXcQ"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Getting started…" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              placeholder="What does this video cover?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="General" />
            </div>
            <div className="space-y-1.5">
              <Label>Sort order</Label>
              <Input type="number" value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value || "0", 10))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? "Saving…" : editing ? "Save changes" : "Add tutorial"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
