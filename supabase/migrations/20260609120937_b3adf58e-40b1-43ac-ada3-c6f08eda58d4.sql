DROP POLICY IF EXISTS plugin_licenses_owner_read ON public.plugin_licenses;
DROP POLICY IF EXISTS plugin_licenses_owner_write ON public.plugin_licenses;

CREATE POLICY plugin_licenses_read ON public.plugin_licenses FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role)
  OR is_brand_owner_of(brand_id, auth.uid())
  OR is_brand_member(brand_id, auth.uid())
);

CREATE POLICY plugin_licenses_write ON public.plugin_licenses FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'owner'::app_role)
  OR is_brand_owner_of(brand_id, auth.uid())
  OR is_brand_member(brand_id, auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'owner'::app_role)
  OR is_brand_owner_of(brand_id, auth.uid())
  OR is_brand_member(brand_id, auth.uid())
);