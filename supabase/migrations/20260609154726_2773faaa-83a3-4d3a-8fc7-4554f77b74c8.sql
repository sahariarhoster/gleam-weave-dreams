
-- 1. Extend brand_status enum
ALTER TYPE public.brand_status ADD VALUE IF NOT EXISTS 'pending';

-- 2. Packages
CREATE TABLE public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  duration_days integer NOT NULL DEFAULT 30,
  device_limit integer NOT NULL DEFAULT 1,
  message_limit integer,
  license_count integer NOT NULL DEFAULT 1,
  is_trial boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.packages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.packages TO authenticated;
GRANT ALL ON public.packages TO service_role;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packages_read_active_public" ON public.packages FOR SELECT TO anon, authenticated USING (is_active = true OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "packages_owner_write" ON public.packages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE TRIGGER trg_packages_updated BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Coupons
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric(10,2) NOT NULL,
  max_uses integer,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "coupons_owner_all" ON public.coupons FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE TRIGGER trg_coupons_updated BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES public.packages(id),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  coupon_id uuid REFERENCES public.coupons(id),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  bkash_number text NOT NULL,
  txid text NOT NULL,
  original_amount numeric(10,2) NOT NULL,
  discount_amount numeric(10,2) NOT NULL DEFAULT 0,
  final_amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes text,
  approved_at timestamptz,
  approved_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_owner_all" ON public.orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner')) WITH CHECK (public.has_role(auth.uid(), 'owner'));
CREATE POLICY "orders_user_own" ON public.orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Seed Trial package
INSERT INTO public.packages (name, description, price, duration_days, device_limit, message_limit, license_count, is_trial, sort_order)
VALUES ('Trial', '3-day trial — 1 device, 1 WordPress license, unlimited SMS', 100, 3, 1, NULL, 1, true, 0);

-- 6. validate_coupon function
CREATE OR REPLACE FUNCTION public.validate_coupon(_code text, _amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.coupons%ROWTYPE;
  discount numeric;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE lower(code) = lower(_code) AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'error', 'Invalid coupon'); END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at < now() THEN RETURN jsonb_build_object('valid', false, 'error', 'Coupon expired'); END IF;
  IF c.max_uses IS NOT NULL AND c.used_count >= c.max_uses THEN RETURN jsonb_build_object('valid', false, 'error', 'Coupon usage limit reached'); END IF;
  IF c.discount_type = 'percent' THEN
    discount := round(_amount * c.discount_value / 100, 2);
  ELSE
    discount := least(c.discount_value, _amount);
  END IF;
  RETURN jsonb_build_object('valid', true, 'id', c.id, 'code', c.code, 'discount', discount, 'final', greatest(_amount - discount, 0));
END;
$$;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text, numeric) TO anon, authenticated;
