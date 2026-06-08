
-- 1) Remove column-level SELECT on devices.api_secret from regular roles
REVOKE SELECT (api_secret) ON public.devices FROM authenticated;
REVOKE SELECT (api_secret) ON public.devices FROM anon;

-- 2) Restrict system_settings reads to owners only
DROP POLICY IF EXISTS system_settings_read ON public.system_settings;
CREATE POLICY system_settings_read ON public.system_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- 3) Add restrictive write policies on user_roles (block all client-side writes)
DROP POLICY IF EXISTS user_roles_no_client_insert ON public.user_roles;
DROP POLICY IF EXISTS user_roles_no_client_update ON public.user_roles;
DROP POLICY IF EXISTS user_roles_no_client_delete ON public.user_roles;
CREATE POLICY user_roles_no_client_insert ON public.user_roles
  AS RESTRICTIVE FOR INSERT TO authenticated, anon WITH CHECK (false);
CREATE POLICY user_roles_no_client_update ON public.user_roles
  AS RESTRICTIVE FOR UPDATE TO authenticated, anon USING (false) WITH CHECK (false);
CREATE POLICY user_roles_no_client_delete ON public.user_roles
  AS RESTRICTIVE FOR DELETE TO authenticated, anon USING (false);
