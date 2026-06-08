
-- 1. Profiles: restrict reads
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'owner'));

-- 2. Devices: revoke column-level read of api_secret from authenticated; service_role retains full access
REVOKE SELECT ON public.devices FROM authenticated;
GRANT SELECT (id, name, device_unique_id, sim_info, brand_id, status, last_checked_at, created_by, created_at, updated_at)
  ON public.devices TO authenticated;

-- 3. Plugin licenses: split read/write so only owners/brand owners can see license keys
DROP POLICY IF EXISTS plugin_licenses_access ON public.plugin_licenses;
CREATE POLICY plugin_licenses_owner_read ON public.plugin_licenses
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner')
    OR public.is_brand_owner_of(brand_id, auth.uid())
  );
CREATE POLICY plugin_licenses_owner_write ON public.plugin_licenses
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'owner')
    OR public.is_brand_owner_of(brand_id, auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'owner')
    OR public.is_brand_owner_of(brand_id, auth.uid())
  );
