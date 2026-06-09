
CREATE OR REPLACE FUNCTION public.get_report_stats_for_user(
  _user_id uuid,
  _start date,
  _end date,
  _brand_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
WITH allowed_brands AS (
  SELECT b.id, b.name
  FROM public.brands b
  WHERE public.has_role(_user_id, 'owner'::public.app_role)
     OR b.created_by = _user_id
     OR public.is_brand_member(b.id, _user_id)
     OR public.is_brand_owner_of(b.id, _user_id)
),
filtered_brands AS (
  SELECT * FROM allowed_brands WHERE _brand_id IS NULL OR id = _brand_id
),
camp_msgs AS (
  SELECT c.brand_id, cm.status, cm.created_at
  FROM public.campaign_messages cm
  JOIN public.campaigns c ON c.id = cm.campaign_id
  WHERE cm.created_at >= _start::timestamptz
    AND cm.created_at < (_end + 1)::timestamptz
    AND c.brand_id IN (SELECT id FROM filtered_brands)
),
act_msgs AS (
  SELECT al.brand_id, (al.details->>'status') AS http_status, al.created_at
  FROM public.activity_log al
  WHERE al.action IN ('plugin_send','send_single')
    AND al.created_at >= _start::timestamptz
    AND al.created_at < (_end + 1)::timestamptz
    AND al.brand_id IN (SELECT id FROM filtered_brands)
),
combined AS (
  SELECT brand_id,
    (status IN ('sent','delivered'))::int AS sent_ok,
    (status = 'failed')::int AS failed
  FROM camp_msgs
  UNION ALL
  SELECT brand_id,
    (http_status = '200')::int AS sent_ok,
    (http_status <> '200' OR http_status IS NULL)::int AS failed
  FROM act_msgs
),
per_brand AS (
  SELECT fb.id, fb.name,
    coalesce(sum(c.sent_ok),0)::int AS sent,
    coalesce(sum(c.failed),0)::int AS failed,
    (coalesce(sum(c.sent_ok),0) + coalesce(sum(c.failed),0))::int AS total
  FROM filtered_brands fb
  LEFT JOIN combined c ON c.brand_id = fb.id
  GROUP BY fb.id, fb.name
  ORDER BY total DESC, fb.name
),
totals AS (
  SELECT
    coalesce(sum(sent),0)::int AS sent,
    coalesce(sum(failed),0)::int AS failed,
    coalesce(sum(total),0)::int AS total
  FROM per_brand
)
SELECT jsonb_build_object(
  'range', jsonb_build_object('start', _start, 'end', _end),
  'totals', jsonb_build_object(
    'sent', totals.sent,
    'failed', totals.failed,
    'total', totals.total,
    'successRate', CASE WHEN totals.total > 0
      THEN round((totals.sent::numeric / totals.total) * 100, 1)
      ELSE 0 END
  ),
  'brands', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'sent', sent, 'failed', failed, 'total', total,
      'successRate', CASE WHEN total > 0 THEN round((sent::numeric/total)*100,1) ELSE 0 END
    )) FROM per_brand
  ), '[]'::jsonb)
)
FROM totals;
$$;

GRANT EXECUTE ON FUNCTION public.get_report_stats_for_user(uuid, date, date, uuid) TO authenticated, service_role;
