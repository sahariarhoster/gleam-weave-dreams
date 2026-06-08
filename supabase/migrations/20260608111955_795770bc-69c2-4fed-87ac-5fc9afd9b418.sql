ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS plugin_version text NOT NULL DEFAULT '1.0.0',
  ADD COLUMN IF NOT EXISTS plugin_download_url text,
  ADD COLUMN IF NOT EXISTS plugin_changelog text,
  ADD COLUMN IF NOT EXISTS plugin_tested_wp text,
  ADD COLUMN IF NOT EXISTS plugin_requires_wp text,
  ADD COLUMN IF NOT EXISTS plugin_requires_php text;

INSERT INTO public.system_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;