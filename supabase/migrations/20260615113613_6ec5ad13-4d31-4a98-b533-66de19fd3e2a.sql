
-- Allow brands to use BOTH a legacy subscription AND credits at the same time.
-- 1) Top-up no longer flips pricing_model away from legacy_subscription.
-- 2) deduct_credit lets the legacy subscription cover sends while it's valid,
--    then automatically falls back to credits once the subscription expires.
-- 3) can_send permits any of: valid legacy sub, or positive credit balance.

CREATE OR REPLACE FUNCTION public.top_up_credits(_brand_id uuid, _credits integer, _package_id uuid, _tk numeric, _order_id uuid)
RETURNS public.credit_wallets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE w public.credit_wallets; pm public.pricing_model;
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

  SELECT pricing_model INTO pm FROM public.brands WHERE id = _brand_id;
  -- Only move brand onto the credit model if it isn't already a legacy subscriber.
  -- Legacy subscribers keep their plan; their wallet becomes overflow / post-expiry credit.
  IF pm = 'trial' THEN
    UPDATE public.brands SET pricing_model = 'credits' WHERE id = _brand_id;
  END IF;
  RETURN w;
END $$;

CREATE OR REPLACE FUNCTION public.deduct_credit(_brand_id uuid, _message_ref text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_balance int; pm public.pricing_model; sub_exp timestamptz;
BEGIN
  SELECT pricing_model, expires_at INTO pm, sub_exp FROM public.brands WHERE id = _brand_id;

  -- Legacy subscription still valid: subscription covers the send, no credit deduction.
  IF pm = 'legacy_subscription' AND (sub_exp IS NULL OR sub_exp > now()) THEN
    RETURN -1;
  END IF;

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

CREATE OR REPLACE FUNCTION public.can_send(_brand_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    -- Legacy subscription still within term
    (EXISTS (
       SELECT 1 FROM public.brands b
       WHERE b.id = _brand_id
         AND b.pricing_model = 'legacy_subscription'
         AND (b.expires_at IS NULL OR b.expires_at > now())
    ))
    OR
    -- Or has credits available (works for credits brands AND legacy after expiry)
    (EXISTS (
       SELECT 1 FROM public.credit_wallets w
       WHERE w.brand_id = _brand_id AND w.balance > 0
         AND (w.expires_at IS NULL OR w.expires_at > now())
    ));
$$;
