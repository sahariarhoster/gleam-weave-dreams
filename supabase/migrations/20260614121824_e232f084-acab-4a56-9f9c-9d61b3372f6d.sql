CREATE OR REPLACE FUNCTION public.get_dashboard_stats_for_current_user(_start date DEFAULT NULL::date, _end date DEFAULT NULL::date)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.get_dashboard_stats_for_user(auth.uid(), _start, _end);
$$;

REVOKE ALL ON FUNCTION public.get_dashboard_stats_for_current_user(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats_for_current_user(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats_for_current_user(date, date) TO service_role;