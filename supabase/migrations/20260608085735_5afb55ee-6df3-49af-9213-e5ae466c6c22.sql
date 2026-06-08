ALTER TYPE public.brand_role ADD VALUE IF NOT EXISTS 'brand_member';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  owner_count INTEGER;
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  SELECT COUNT(*) INTO owner_count FROM public.user_roles WHERE role = 'owner';
  IF owner_count = 0 THEN
    assigned_role := 'owner';
  ELSE
    assigned_role := 'brand_owner';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, assigned_role);
  RETURN NEW;
END;
$function$;