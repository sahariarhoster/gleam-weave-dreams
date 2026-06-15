
-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.pricing_model AS ENUM ('legacy_subscription','trial','credits');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.order_kind AS ENUM ('subscription','credit_topup','addon');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.credit_txn_type AS ENUM ('topup','deduct','refund','adjustment','expiry');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.addon_kind AS ENUM ('device','wp_license','combo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============ credit_packages ============
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  tk_per_credit numeric(10,4) NOT NULL CHECK (tk_per_credit > 0),
  min_topup_tk numeric(10,2) NOT NULL CHECK (min_topup_tk > 0),
  device_limit int NOT NULL DEFAULT 1,
  wp_site_limit int NOT NULL DEFAULT 3,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_packages TO anon, authenticated;
GRANT ALL ON public.credit_packages TO service_role;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active credit packages" ON public.credit_packages FOR SELECT USING (true);
CREATE POLICY "Owners manage credit packages" ON public.credit_packages FOR ALL TO authenticated USING (public.has_role(auth.uid(),'owner')) WITH CHECK (public.has_role(auth.uid(),'owner'));
CREATE TRIGGER trg_credit_packages_updated BEFORE UPDATE ON public.credit_packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ credit_wallets ============
CREATE TABLE IF NOT EXISTS public.credit_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL UNIQUE REFERENCES public.brands(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.credit_packages(id) ON DELETE SET NULL,
  balance int NOT NULL DEFAULT 0,
  expires_at timestamptz,
  last_low_balance_notice_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.credit_wallets TO authenticated;
GRANT ALL ON public.credit_wallets TO service_role;
ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own wallet" ON public.credit_wallets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.is_brand_member(brand_id, auth.uid()) OR public.is_brand_owner_of(brand_id, auth.uid()));
CREATE POLICY "Owners modify wallets" ON public.credit_wallets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'owner')) WITH CHECK (public.has_role(auth.uid(),'owner'));
CREATE TRIGGER trg_credit_wallets_updated BEFORE UPDATE ON public.credit_wallets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ credit_transactions ============
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  type public.credit_txn_type NOT NULL,
  credits int NOT NULL,
  tk_amount numeric(10,2),
  balance_after int,
  order_id uuid,
  message_ref text,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_credit_txn_brand_created ON public.credit_transactions(brand_id, created_at DESC);
GRANT SELECT, INSERT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own credit txns" ON public.credit_transactions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.is_brand_member(brand_id, auth.uid()) OR public.is_brand_owner_of(brand_id, auth.uid()));
CREATE POLICY "Owners insert credit txns" ON public.credit_transactions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'owner'));

-- ============ addon_purchases ============
CREATE TABLE IF NOT EXISTS public.addon_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  kind public.addon_kind NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price_tk numeric(10,2) NOT NULL,
  total_tk numeric(10,2) NOT NULL,
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.addon_purchases TO authenticated;
GRANT ALL ON public.addon_purchases TO service_role;
ALTER TABLE public.addon_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view own addons" ON public.addon_purchases FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'owner') OR public.is_brand_member(brand_id, auth.uid()) OR public.is_brand_owner_of(brand_id, auth.uid()));
CREATE POLICY "Owners insert addons" ON public.addon_purchases FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'owner'));

-- ============ brands additions ============
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS pricing_model public.pricing_model NOT NULL DEFAULT 'trial';
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS trial_used_at timestamptz;

-- ============ orders additions ============
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS kind public.order_kind NOT NULL DEFAULT 'subscription';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS credit_package_id uuid REFERENCES public.credit_packages(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS credits_purchased int;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS addon_kind public.addon_kind;

-- ============ system_settings additions ============
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS low_balance_threshold int NOT NULL DEFAULT 100;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS low_balance_wa_template text DEFAULT 'আপনার WA Suite ক্রেডিট ব্যালেন্স কম: {{balance}} ক্রেডিট বাকি। দয়া করে রিচার্জ করুন।';
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS zero_balance_wa_template text DEFAULT 'আপনার WA Suite ক্রেডিট শেষ! সব ক্যাম্পেইন স্থগিত করা হয়েছে। দয়া করে রিচার্জ করুন।';

-- ============ Functions ============
CREATE OR REPLACE FUNCTION public.top_up_credits(_brand_id uuid, _credits int, _package_id uuid, _tk numeric, _order_id uuid)
RETURNS public.credit_wallets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE w public.credit_wallets;
BEGIN
  INSERT INTO public.credit_wallets(brand_id, package_id, balance, expires_at)
  VALUES (_brand_id, _package_id, _credits, now() + interval '6 months')
  ON CONFLICT (brand_id) DO UPDATE
    SET balance = public.credit_wallets.balance + EXCLUDED.balance,
        package_id = COALESCE(EXCLUDED.package_id, public.credit_wallets.package_id),
        expires_at = now() + interval '6 months',
        updated_at = now()
  RETURNING * INTO w;

  INSERT INTO public.credit_transactions(brand_id, type, credits, tk_amount, balance_after, order_id, note)
  VALUES (_brand_id, 'topup', _credits, _tk, w.balance, _order_id, 'Top-up');

  UPDATE public.brands SET pricing_model = 'credits' WHERE id = _brand_id AND pricing_model <> 'legacy_subscription';
  RETURN w;
END $$;

CREATE OR REPLACE FUNCTION public.can_send(_brand_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN (SELECT pricing_model FROM public.brands WHERE id = _brand_id) = 'legacy_subscription' THEN true
    WHEN EXISTS (SELECT 1 FROM public.credit_wallets WHERE brand_id = _brand_id AND balance > 0 AND (expires_at IS NULL OR expires_at > now())) THEN true
    ELSE false
  END;
$$;

CREATE OR REPLACE FUNCTION public.deduct_credit(_brand_id uuid, _message_ref text)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE new_balance int; pm public.pricing_model;
BEGIN
  SELECT pricing_model INTO pm FROM public.brands WHERE id = _brand_id;
  IF pm = 'legacy_subscription' THEN RETURN -1; END IF;

  UPDATE public.credit_wallets
  SET balance = balance - 1, updated_at = now()
  WHERE brand_id = _brand_id AND balance > 0 AND (expires_at IS NULL OR expires_at > now())
  RETURNING balance INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  INSERT INTO public.credit_transactions(brand_id, type, credits, balance_after, message_ref)
  VALUES (_brand_id, 'deduct', -1, new_balance, _message_ref);

  IF new_balance = 0 THEN
    UPDATE public.campaigns SET status = 'paused' WHERE brand_id = _brand_id AND status IN ('running','scheduled');
  END IF;

  RETURN new_balance;
END $$;

CREATE OR REPLACE FUNCTION public.expire_credits()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN SELECT brand_id, balance FROM public.credit_wallets WHERE expires_at < now() AND balance > 0 LOOP
    UPDATE public.credit_wallets SET balance = 0, updated_at = now() WHERE brand_id = r.brand_id;
    INSERT INTO public.credit_transactions(brand_id, type, credits, balance_after, note)
    VALUES (r.brand_id, 'expiry', -r.balance, 0, 'Credits expired');
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

-- ============ Seed packages ============
INSERT INTO public.credit_packages(code, name, tk_per_credit, min_topup_tk, device_limit, wp_site_limit, sort_order)
VALUES
  ('sme', 'SME Pack', 0.80, 500, 1, 3, 1),
  ('corporate', 'Corporate Pack', 0.65, 1000, 3, 5, 2)
ON CONFLICT (code) DO NOTHING;

-- ============ Backfill brands ============
-- Brands with active paid subscription = legacy
UPDATE public.brands b SET pricing_model = 'legacy_subscription'
WHERE EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.brand_id = b.id AND o.status = 'completed' AND COALESCE(o.kind,'subscription') = 'subscription'
);
-- Remaining stay default 'trial'; mark trial_used_at if they have any orders
UPDATE public.brands b SET trial_used_at = b.created_at
WHERE pricing_model = 'trial' AND trial_used_at IS NULL;
