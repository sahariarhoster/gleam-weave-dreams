CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH days AS (
  SELECT generate_series(
    date_trunc('day', now()) - interval '6 days',
    date_trunc('day', now()),
    interval '1 day'
  )::date AS day
),
visible_devices AS (
  SELECT id, name, status, created_at FROM public.devices
),
visible_brands AS (
  SELECT id FROM public.brands
),
visible_brand_members AS (
  SELECT id FROM public.brand_members
),
visible_campaigns AS (
  SELECT id, status FROM public.campaigns
),
visible_blocked AS (
  SELECT id FROM public.blocked_numbers
),
visible_messages AS (
  SELECT status, created_at FROM public.campaign_messages
),
visible_plugin_messages AS (
  SELECT details, created_at
  FROM public.activity_log
  WHERE action = 'plugin_send'
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
    FROM jsonb_array_elements(series.data) value
    WHERE value->>'date' = to_char(now(), 'YYYY-MM-DD')
  ),
  'series', coalesce(series.data, '[]'::jsonb),
  'topDevices', top_devices.data
)
FROM counts, message_totals mt, plugin_totals pt, series, top_devices;
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO service_role;
