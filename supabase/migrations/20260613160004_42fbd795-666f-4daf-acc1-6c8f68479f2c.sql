CREATE TABLE public.wa_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  secret text NOT NULL,
  sid integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wa_api_keys TO authenticated;
GRANT ALL ON public.wa_api_keys TO service_role;

ALTER TABLE public.wa_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage api keys"
  ON public.wa_api_keys
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));