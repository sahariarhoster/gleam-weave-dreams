
DO $$
DECLARE
  new_user_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated', 'authenticated',
    'hsadmin@hostercamp.com',
    crypt('Sahariar112233@@', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"HS Admin"}'::jsonb,
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (gen_random_uuid(), new_user_id,
    jsonb_build_object('sub', new_user_id::text, 'email', 'hsadmin@hostercamp.com', 'email_verified', true),
    'email', new_user_id::text, now(), now(), now());

  -- handle_new_user trigger should have created profile + role, but force owner role
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new_user_id, 'hsadmin@hostercamp.com', 'HS Admin')
  ON CONFLICT (id) DO NOTHING;

  DELETE FROM public.user_roles WHERE user_id = new_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (new_user_id, 'owner');
END $$;
