
-- 1) Remove support agent access to sensitive system_settings
DROP POLICY IF EXISTS system_settings_support_all ON public.system_settings;

-- 2) Scope brand-owner ALL policies to authenticated only
DROP POLICY IF EXISTS brands_brand_owner_modify ON public.brands;
CREATE POLICY brands_brand_owner_modify ON public.brands
  AS PERMISSIVE FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS brand_members_brand_owner_all ON public.brand_members;
CREATE POLICY brand_members_brand_owner_all ON public.brand_members
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.is_brand_owner_of(brand_id, auth.uid()))
  WITH CHECK (public.is_brand_owner_of(brand_id, auth.uid()));

DROP POLICY IF EXISTS devices_brand_owner_modify ON public.devices;
CREATE POLICY devices_brand_owner_modify ON public.devices
  AS PERMISSIVE FOR ALL TO authenticated
  USING (brand_id IS NOT NULL AND public.is_brand_owner_of(brand_id, auth.uid()))
  WITH CHECK (brand_id IS NOT NULL AND public.is_brand_owner_of(brand_id, auth.uid()));

DROP POLICY IF EXISTS plugin_licenses_write ON public.plugin_licenses;
CREATE POLICY plugin_licenses_write ON public.plugin_licenses
  AS PERMISSIVE FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner'::public.app_role)
    OR public.is_brand_owner_of(brand_id, auth.uid())
    OR public.is_brand_admin(brand_id, auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'owner'::public.app_role)
    OR public.is_brand_owner_of(brand_id, auth.uid())
    OR public.is_brand_admin(brand_id, auth.uid())
  );
