ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS tpl_order_placed text,
  ADD COLUMN IF NOT EXISTS tpl_order_approved text,
  ADD COLUMN IF NOT EXISTS tpl_order_admin text;