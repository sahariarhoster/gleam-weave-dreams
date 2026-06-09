GRANT EXECUTE ON FUNCTION public.get_dashboard_stats_for_user(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_brand_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_brand_admin(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_brand_owner_of(uuid, uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats_for_user(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_dashboard_stats() FROM anon, public;