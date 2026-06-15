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

  -- Always switch brand to credits model on top-up; expire any legacy subscription immediately.
  UPDATE public.brands
  SET pricing_model = 'credits',
      expires_at = LEAST(COALESCE(expires_at, now()), now()),
      current_package_id = NULL,
      cancel_requested_at = NULL,
      status = 'active'
  WHERE id = _brand_id;

  RETURN w;
END $function$;