CREATE OR REPLACE FUNCTION public.top_up_credits(_brand_id uuid, _credits integer, _package_id uuid, _tk numeric, _order_id uuid)
 RETURNS credit_wallets
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Switch to credits model on top-up. Keep existing expires_at so any
  -- remaining subscription time is not wiped; can_send() will still allow
  -- sends via wallet balance regardless.
  UPDATE public.brands
  SET pricing_model = 'credits',
      current_package_id = NULL,
      cancel_requested_at = NULL,
      status = 'active'
  WHERE id = _brand_id;

  RETURN w;
END $function$;

-- Update can_send so legacy_subscription is the ONLY model that uses subscription time.
-- Brands on 'credits' model always go through the wallet, even if expires_at is in the future.
CREATE OR REPLACE FUNCTION public.can_send(_brand_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    (EXISTS (
       SELECT 1 FROM public.brands b
       WHERE b.id = _brand_id
         AND b.pricing_model = 'legacy_subscription'
         AND (b.expires_at IS NULL OR b.expires_at > now())
    ))
    OR
    (EXISTS (
       SELECT 1 FROM public.credit_wallets w
       WHERE w.brand_id = _brand_id AND w.balance > 0
         AND (w.expires_at IS NULL OR w.expires_at > now())
    ));
$function$;
