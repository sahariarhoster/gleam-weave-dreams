
-- Re-assert column-level revoke on devices.api_secret (idempotent)
REVOKE SELECT (api_secret) ON public.devices FROM authenticated;
REVOKE SELECT (api_secret) ON public.devices FROM anon;

-- Tighten activity_log INSERT: only allow self-attribution AND a known action whitelist
DROP POLICY IF EXISTS activity_log_insert_self ON public.activity_log;
CREATE POLICY activity_log_insert_self ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND action IN (
      'send_single','campaign_run','campaign_pause','campaign_resume',
      'login','logout','impersonate','reset_password','profile_update',
      'device_test','brand_update','member_update'
    )
    AND (
      brand_id IS NULL
      OR public.is_brand_member(brand_id, auth.uid())
      OR public.is_brand_owner_of(brand_id, auth.uid())
      OR public.has_role(auth.uid(), 'owner'::app_role)
    )
  );
