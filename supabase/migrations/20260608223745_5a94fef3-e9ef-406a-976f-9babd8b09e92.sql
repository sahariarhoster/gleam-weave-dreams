REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_dashboard_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO service_role;