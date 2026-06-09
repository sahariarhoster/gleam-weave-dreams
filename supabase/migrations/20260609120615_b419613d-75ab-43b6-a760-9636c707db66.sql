DROP POLICY IF EXISTS "manage device requests" ON public.device_requests;

CREATE POLICY "device_requests_access"
ON public.device_requests
FOR ALL
TO authenticated
USING (
  public.is_brand_owner_of(brand_id, auth.uid())
  OR public.is_brand_member(brand_id, auth.uid())
  OR public.has_role(auth.uid(), 'owner'::public.app_role)
  OR public.has_role(auth.uid(), 'sales_agent'::public.app_role)
)
WITH CHECK (
  public.is_brand_owner_of(brand_id, auth.uid())
  OR public.is_brand_member(brand_id, auth.uid())
  OR public.has_role(auth.uid(), 'owner'::public.app_role)
  OR public.has_role(auth.uid(), 'sales_agent'::public.app_role)
);