
-- Helper: brand members excluding the low-privilege "sender" role
CREATE OR REPLACE FUNCTION public.is_brand_staff_member(_brand_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.brand_members
    WHERE brand_id = _brand_id AND user_id = _user_id AND role <> 'sender'
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_brand_staff_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_brand_staff_member(uuid, uuid) TO authenticated, service_role;

-- 1) Devices: exclude sender role from SELECT (protects api_secret column)
DROP POLICY IF EXISTS devices_select ON public.devices;
CREATE POLICY devices_select ON public.devices
  FOR SELECT
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'support_agent'::app_role)
    OR (brand_id IS NOT NULL AND (
      is_brand_owner_of(brand_id, auth.uid())
      OR is_brand_staff_member(brand_id, auth.uid())
    ))
  );

-- 2) Plugin licenses: split write policy — only brand admins/owners can mutate
DROP POLICY IF EXISTS plugin_licenses_write ON public.plugin_licenses;
CREATE POLICY plugin_licenses_write ON public.plugin_licenses
  FOR ALL
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR is_brand_owner_of(brand_id, auth.uid())
    OR is_brand_admin(brand_id, auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'owner'::app_role)
    OR is_brand_owner_of(brand_id, auth.uid())
    OR is_brand_admin(brand_id, auth.uid())
  );

-- 3) Device requests: split read/insert from update/delete
DROP POLICY IF EXISTS device_requests_access ON public.device_requests;

CREATE POLICY device_requests_select ON public.device_requests
  FOR SELECT
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'sales_agent'::app_role)
    OR has_role(auth.uid(), 'support_agent'::app_role)
    OR is_brand_owner_of(brand_id, auth.uid())
    OR is_brand_member(brand_id, auth.uid())
  );

CREATE POLICY device_requests_insert ON public.device_requests
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'owner'::app_role)
    OR is_brand_owner_of(brand_id, auth.uid())
    OR is_brand_member(brand_id, auth.uid())
  );

CREATE POLICY device_requests_modify ON public.device_requests
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'sales_agent'::app_role)
    OR has_role(auth.uid(), 'support_agent'::app_role)
    OR is_brand_owner_of(brand_id, auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'sales_agent'::app_role)
    OR has_role(auth.uid(), 'support_agent'::app_role)
    OR is_brand_owner_of(brand_id, auth.uid())
  );

CREATE POLICY device_requests_delete ON public.device_requests
  FOR DELETE
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'sales_agent'::app_role)
    OR has_role(auth.uid(), 'support_agent'::app_role)
    OR is_brand_owner_of(brand_id, auth.uid())
  );
