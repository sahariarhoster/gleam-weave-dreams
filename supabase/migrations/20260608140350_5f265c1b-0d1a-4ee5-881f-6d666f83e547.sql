ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS whmcs_service_id text,
  ADD COLUMN IF NOT EXISTS whmcs_product_id text;
CREATE UNIQUE INDEX IF NOT EXISTS brands_whmcs_service_id_uidx
  ON public.brands(whmcs_service_id) WHERE whmcs_service_id IS NOT NULL;