
-- 1) Hide devices.api_secret from authenticated/anon roles. Server uses service_role.
REVOKE SELECT (api_secret) ON public.devices FROM authenticated;
REVOKE SELECT (api_secret) ON public.devices FROM anon;

-- 2) Orders: explicit self-insert policy
DROP POLICY IF EXISTS orders_user_insert_self ON public.orders;
CREATE POLICY orders_user_insert_self ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
