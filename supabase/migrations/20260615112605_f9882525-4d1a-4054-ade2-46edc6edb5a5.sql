ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS business_doc_type text CHECK (business_doc_type IN ('nid','trade_license')),
  ADD COLUMN IF NOT EXISTS business_doc_number text;