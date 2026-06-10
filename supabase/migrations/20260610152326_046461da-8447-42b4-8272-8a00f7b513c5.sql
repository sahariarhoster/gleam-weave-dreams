ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ip_address text;
CREATE INDEX IF NOT EXISTS orders_phone_created_idx ON public.orders (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_ip_created_idx ON public.orders (ip_address, created_at DESC);