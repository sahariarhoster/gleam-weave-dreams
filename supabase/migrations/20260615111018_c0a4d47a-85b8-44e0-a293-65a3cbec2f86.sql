
REVOKE EXECUTE ON FUNCTION public.top_up_credits(uuid,int,uuid,numeric,uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_credit(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_credits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.top_up_credits(uuid,int,uuid,numeric,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_credit(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_credits() TO service_role;
