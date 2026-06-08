ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS whmcs_api_token text;