
ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS current_package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancel_requested_at timestamptz;

-- Backfill current_package_id from latest approved order
UPDATE public.brands b
SET current_package_id = sub.package_id
FROM (
  SELECT DISTINCT ON (brand_id) brand_id, package_id
  FROM public.orders
  WHERE status = 'approved'
  ORDER BY brand_id, approved_at DESC NULLS LAST, created_at DESC
) sub
WHERE b.id = sub.brand_id AND b.current_package_id IS NULL;
