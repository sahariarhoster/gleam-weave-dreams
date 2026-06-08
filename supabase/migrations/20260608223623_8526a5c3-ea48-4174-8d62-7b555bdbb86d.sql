CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH current_user_context AS (
  SELECT auth.uid() AS user_id
),
allowed_brands AS (
  SELECT b.id
  FROM public.brands b, current_user_context ctx
  WHERE public.has_role(ctx.user_id, 'owner'::public.app_role)
     OR b.created_by = ctx.user_id
     OR public.is_brand_member(b.id, ctx.user_id)
     OR public.is_brand_owner_of(b.id, ctx.user_id)
),
days AS (
  SELECT generate_series(
    date_trunc('day', now()) - interval '6 days',
    date_trunc('day', now()),
    interval '1 day'
  )::date AS day
),
visible_devices AS (
  SELECT d.id, d.name, d.status, d.created_at
  FROM public.devices d, current_user_context ctx
  WHERE public.has_role(ctx.user_id, 'owner'::public.app_role)
     OR d.brand_id IN (SELECT id FROM allowed_brands)
),
visible_brands AS (
  SELECT id FROM allowed_brands
),
visible_brand_members AS (
  SELECT bm.id
  FROM public.brand_members bm, current_user_context ctx
  WHERE public.has_role(ctx.user_id, 'owner'::public.app_role)
     OR bm.brand_id IN (SELECT id FROM allowed_brands)
),
visible_campaigns AS (
  SELECT c.id, c.status, c.brand_id
  FROM public.campaigns c, current_user_context ctx
  WHERE public.has_role(ctx.user_id, 'owner'::public.app_role)
     OR c.brand_id IN (SELECT id FROM allowed_brands)
),
visible_blocked AS (
  SELECT bn.id
  FROM public.blocked_numbers bn, current_user_context ctx
  WHERE public.has_role(ctx.user_id, 'owner'::public.app_role)
     OR bn.brand_id IN (SELECT id FROM allowed_brands)
),
visible_messages AS (
  SELECT cm.status, cm.created_at
  FROM public.campaign_messages cm
  JOIN visible_campaigns vc ON vc.id = cm.campaign_id
),
visible_plugin_messages AS (
  SELECT al.details, al.created_at
  FROM public.activity_log al, current_user_context ctx
  WHERE al.action = 'plugin_send'
    AND (
      public.has_role(ctx.user_id, 'owner'::public.app_role)
      OR al.brand_id IN (SELECT id FROM allowed_brands)
      OR al.user_id = ctx.user_id
    )
),
message_totals AS (
  SELECT
    count(*)::int AS total,
    count(*) FILTER (WHERE status IN ('sent', 'delivered'))::int AS delivered,
    count(*) FILTER (WHERE status = 'failed')::int AS failed
  FROM visible_messages
),
plugin_totals AS (
  SELECT
    count(*)::int AS total,
    count(*) FILTER (WHERE details->>'status' = '200')::int AS delivered
  FROM visible_plugin_messages
),
daily_campaign AS (
  SELECT
    created_at::date AS day,
    count(*) FILTER (WHERE status IN ('sent', 'delivered'))::int AS delivered,
    count(*) FILTER (WHERE status = 'failed')::int AS failed,
    count(*) FILTER (WHERE status NOT IN ('sent', 'delivered', 'failed'))::int AS pending
  FROM visible_messages
  WHERE created_at >= date_trunc('day', now()) - interval '6 days'
  GROUP BY created_at::date
),
daily_plugin AS (
  SELECT
    created_at::date AS day,
    count(*) FILTER (WHERE details->>'status' = '200')::int AS delivered,
    count(*) FILTER (WHERE details->>'status' <> '200' OR details->>'status' IS NULL)::int AS failed
  FROM visible_plugin_messages
  WHERE created_at >= date_trunc('day', now()) - interval '6 days'
  GROUP BY created_at::date
),
series AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', to_char(days.day, 'YYYY-MM-DD'),
      'delivered', coalesce(dc.delivered, 0) + coalesce(dp.delivered, 0),
      'failed', coalesce(dc.failed, 0) + coalesce(dp.failed, 0),
      'pending', coalesce(dc.pending, 0)
    )
    ORDER BY days.day
  ) AS data
  FROM days
  LEFT JOIN daily_campaign dc ON dc.day = days.day
  LEFT JOIN daily_plugin dp ON dp.day = days.day
),
top_devices AS (
  SELECT coalesce(jsonb_agg(
    jsonb_build_object('id', id, 'name', name, 'status', status)
    ORDER BY created_at DESC
  ), '[]'::jsonb) AS data
  FROM (
    SELECT id, name, status, created_at
    FROM visible_devices
    ORDER BY created_at DESC
    LIMIT 5
  ) latest
),
counts AS (
  SELECT
    (SELECT count(*)::int FROM visible_devices) AS devices,
    (SELECT count(*)::int FROM visible_devices WHERE status::text IN ('active', 'online')) AS devices_online,
    (SELECT count(*)::int FROM visible_brands) AS brands,
    (SELECT count(*)::int FROM visible_brand_members) AS brand_users,
    (SELECT count(*)::int FROM visible_campaigns) AS campaigns,
    (SELECT count(*)::int FROM visible_campaigns WHERE status IN ('running', 'scheduled')) AS active_campaigns,
    (SELECT count(*)::int FROM visible_blocked) AS blocked_numbers
)
SELECT jsonb_build_object(
  'devices', counts.devices,
  'devicesOnline', counts.devices_online,
  'brands', counts.brands,
  'brandUsers', counts.brand_users,
  'campaigns', counts.campaigns,
  'activeCampaigns', counts.active_campaigns,
  'blockedNumbers', counts.blocked_numbers,
  'totalMessages', coalesce(mt.total, 0) + coalesce(pt.total, 0),
  'delivered', coalesce(mt.delivered, 0) + coalesce(pt.delivered, 0),
  'failed', coalesce(mt.failed, 0) + greatest(coalesce(pt.total, 0) - coalesce(pt.delivered, 0), 0),
  'pending', greatest(coalesce(mt.total, 0) - coalesce(mt.delivered, 0) - coalesce(mt.failed, 0), 0),
  'todayMessages', (
    SELECT coalesce(sum((value->>'delivered')::int + (value->>'failed')::int + (value->>'pending')::int), 0)
    FROM jsonb_array_elements(coalesce(series.data, '[]'::jsonb)) value
    WHERE value->>'date' = to_char(now(), 'YYYY-MM-DD')
  ),
  'series', coalesce(series.data, '[]'::jsonb),
  'topDevices', top_devices.data
)
FROM counts, message_totals mt, plugin_totals pt, series, top_devices;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO service_role;