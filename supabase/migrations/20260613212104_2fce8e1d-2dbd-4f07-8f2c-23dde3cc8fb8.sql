CREATE TABLE public.tutorials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutorials TO authenticated;
GRANT ALL ON public.tutorials TO service_role;

ALTER TABLE public.tutorials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed-in can view tutorials"
  ON public.tutorials FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owners can insert tutorials"
  ON public.tutorials FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update tutorials"
  ON public.tutorials FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can delete tutorials"
  ON public.tutorials FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER tutorials_set_updated_at
  BEFORE UPDATE ON public.tutorials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();