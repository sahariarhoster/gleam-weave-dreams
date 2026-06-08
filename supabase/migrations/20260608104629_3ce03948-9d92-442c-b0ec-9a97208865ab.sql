
-- plugin_licenses
CREATE TABLE public.plugin_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  license_key text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL,
  site_url text,
  activated_at timestamptz,
  last_seen_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plugin_licenses TO authenticated;
GRANT ALL ON public.plugin_licenses TO service_role;

ALTER TABLE public.plugin_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plugin_licenses_access" ON public.plugin_licenses
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner')
    OR public.is_brand_owner_of(brand_id, auth.uid())
    OR public.is_brand_member(brand_id, auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'owner')
    OR public.is_brand_owner_of(brand_id, auth.uid())
  );

CREATE TRIGGER plugin_licenses_set_updated_at
  BEFORE UPDATE ON public.plugin_licenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX plugin_licenses_brand_idx ON public.plugin_licenses(brand_id);
CREATE INDEX plugin_licenses_key_idx ON public.plugin_licenses(license_key);

-- system_settings (singleton)
CREATE TABLE public.system_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  licenses_per_brand integer NOT NULL DEFAULT 1 CHECK (licenses_per_brand >= 1 AND licenses_per_brand <= 1000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_settings_read" ON public.system_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "system_settings_write_owner" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER system_settings_set_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.system_settings (id, licenses_per_brand) VALUES (true, 1)
  ON CONFLICT (id) DO NOTHING;
