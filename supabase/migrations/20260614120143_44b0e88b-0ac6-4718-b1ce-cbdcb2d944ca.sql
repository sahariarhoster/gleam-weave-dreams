
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_brand_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_brand_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_brand_owner_of(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_brand_staff_member(uuid, uuid) TO authenticated;
