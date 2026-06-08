
-- 1) Hide devices.api_secret from client reads (server-side admin client still works)
REVOKE SELECT (api_secret) ON public.devices FROM authenticated;
REVOKE SELECT (api_secret) ON public.devices FROM anon;

-- 2) Tighten activity_log insert policy: require brand membership when brand_id provided
DROP POLICY IF EXISTS activity_log_insert_self ON public.activity_log;
CREATE POLICY activity_log_insert_self ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      brand_id IS NULL
      OR public.is_brand_member(brand_id, auth.uid())
      OR public.is_brand_owner_of(brand_id, auth.uid())
      OR public.has_role(auth.uid(), 'owner'::app_role)
    )
  );

-- 3) Trigger-only functions should never be RPC-callable
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
