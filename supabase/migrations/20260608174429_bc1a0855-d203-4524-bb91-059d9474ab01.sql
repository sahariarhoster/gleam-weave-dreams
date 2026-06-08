
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS notify_phone text,
  ADD COLUMN IF NOT EXISTS notify_device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL;

CREATE TABLE public.device_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  device_name text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','done','cancelled')),
  assigned_to uuid,
  admin_reply text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_requests TO authenticated;
GRANT ALL ON public.device_requests TO service_role;

ALTER TABLE public.device_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manage device requests"
  ON public.device_requests FOR ALL
  TO authenticated
  USING (
    public.is_brand_owner_of(brand_id, auth.uid())
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'sales_agent')
  )
  WITH CHECK (
    public.is_brand_owner_of(brand_id, auth.uid())
    OR public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'sales_agent')
  );

CREATE INDEX device_requests_brand_idx ON public.device_requests(brand_id);
CREATE INDEX device_requests_status_idx ON public.device_requests(status);

CREATE TRIGGER device_requests_set_updated_at
  BEFORE UPDATE ON public.device_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
