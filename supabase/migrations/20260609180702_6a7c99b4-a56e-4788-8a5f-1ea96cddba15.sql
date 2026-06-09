
-- Drop and recreate dashboard stats with optional date range, in Asia/Dhaka TZ
DROP FUNCTION IF EXISTS public.get_dashboard_stats();
DROP FUNCTION IF EXISTS public.get_dashboard_stats_for_user(uuid);

CREATE OR REPLACE FUNCTION public.get_dashboard_stats_for_user(
  _user_id uuid,
  _start date DEFAULT NULL,
  _end date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
WITH params AS (
  SELECT
    _user_id AS user_id,
    COALESCE(_end,   ((now() AT TIME ZONE 'Asia/Dhaka')::date))           AS end_day,
    COALESCE(_start, ((now() AT TIME ZONE 'Asia/Dhaka')::date) - 6)       AS start_day
),
range_ts AS (
  SELECT
    (start_day::timestamp AT TIME ZONE 'Asia/Dhaka')             AS start_ts,
    ((end_day + 1)::timestamp AT TIME ZONE 'Asia/Dhaka')         AS end_ts,
    start_day, end_day, user_id
  FROM params
),
allowed_brands AS (
  SELECT b.id
  FROM public.brands b, range_ts r
  WHERE public.has_role(r.user_id, 'owner'::public.app_role)
     OR b.created_by = r.user_id
     OR public.is_brand_member(b.id, r.user_id)
     OR public.is_brand_owner_of(b.id, r.user_id)
),
days AS (
  SELECT generate_series(r.start_day, r.end_day, interval '1 day')::date AS day
  FROM range_ts r
),
visible_devices AS (
  SELECT d.id, d.name, d.status, d.created_at
  FROM public.devices d, range_ts r
  WHERE public.has_role(r.user_id, 'owner'::public.app_role)
     OR d.brand_id IN (SELECT id FROM allowed_brands)
),
visible_brands AS (SELECT id FROM allowed_brands),
visible_brand_members AS (
  SELECT bm.id
  FROM public.brand_members bm, range_ts r
  WHERE public.has_role(r.user_id, 'owner'::public.app_role)
     OR bm.brand_id IN (SELECT id FROM allowed_brands)
),
visible_campaigns AS (
  SELECT c.id, c.status, c.brand_id
  FROM public.campaigns c, range_ts r
  WHERE public.has_role(r.user_id, 'owner'::public.app_role)
     OR c.brand_id IN (SELECT id FROM allowed_brands)
),
visible_blocked AS (
  SELECT bn.id
  FROM public.blocked_numbers bn, range_ts r
  WHERE public.has_role(r.user_id, 'owner'::public.app_role)
     OR bn.brand_id IN (SELECT id FROM allowed_brands)
),
visible_campaign_messages AS (
  SELECT cm.status, cm.created_at
  FROM public.campaign_messages cm
  JOIN visible_campaigns vc ON vc.id = cm.campaign_id, range_ts r
  WHERE cm.created_at >= r.start_ts AND cm.created_at < r.end_ts
),
visible_activity_messages AS (
  SELECT al.details, al.created_at
  FROM public.activity_log al, range_ts r
  WHERE al.action IN ('plugin_send', 'send_single')
    AND al.created_at >= r.start_ts AND al.created_at < r.end_ts
    AND (
      public.has_role(r.user_id, 'owner'::public.app_role)
      OR al.brand_id IN (SELECT id FROM allowed_brands)
      OR al.user_id = r.user_id
    )
),
campaign_totals AS (
  SELECT
    count(*)::int AS total,
    count(*) FILTER (WHERE status IN ('sent','delivered'))::int AS delivered,
    count(*) FILTER (WHERE status = 'failed')::int AS failed
  FROM visible_campaign_messages
),
activity_totals AS (
  SELECT
    count(*)::int AS total,
    count(*) FILTER (WHERE details->>'status' = '200')::int AS delivered,
    count(*) FILTER (WHERE details->>'status' <> '200' OR details->>'status' IS NULL)::int AS failed
  FROM visible_activity_messages
),
daily_campaign AS (
  SELECT
    ((created_at AT TIME ZONE 'Asia/Dhaka')::date) AS day,
    count(*) FILTER (WHERE status IN ('sent','delivered'))::int AS delivered,
    count(*) FILTER (WHERE status = 'failed')::int AS failed,
    count(*) FILTER (WHERE status NOT IN ('sent','delivered','failed'))::int AS pending
  FROM visible_campaign_messages
  GROUP BY 1
),
daily_activity AS (
  SELECT
    ((created_at AT TIME ZONE 'Asia/Dhaka')::date) AS day,
    count(*) FILTER (WHERE details->>'status' = '200')::int AS delivered,
    count(*) FILTER (WHERE details->>'status' <> '200' OR details->>'status' IS NULL)::int AS failed
  FROM visible_activity_messages
  GROUP BY 1
),
series AS (
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', to_char(days.day, 'YYYY-MM-DD'),
      'delivered', coalesce(dc.delivered, 0) + coalesce(da.delivered, 0),
      'failed', coalesce(dc.failed, 0) + coalesce(da.failed, 0),
      'pending', coalesce(dc.pending, 0)
    ) ORDER BY days.day
  ) AS data
  FROM days
  LEFT JOIN daily_campaign dc ON dc.day = days.day
  LEFT JOIN daily_activity da ON da.day = days.day
),
top_devices AS (
  SELECT coalesce(jsonb_agg(
    jsonb_build_object('id', id, 'name', name, 'status', status)
    ORDER BY created_at DESC
  ), '[]'::jsonb) AS data
  FROM (
    SELECT id, name, status, created_at FROM visible_devices
    ORDER BY created_at DESC LIMIT 5
  ) latest
),
counts AS (
  SELECT
    (SELECT count(*)::int FROM visible_devices) AS devices,
    (SELECT count(*)::int FROM visible_devices WHERE status::text IN ('active','online')) AS devices_online,
    (SELECT count(*)::int FROM visible_brands) AS brands,
    (SELECT count(*)::int FROM visible_brand_members) AS brand_users,
    (SELECT count(*)::int FROM visible_campaigns) AS campaigns,
    (SELECT count(*)::int FROM visible_campaigns WHERE status IN ('running','scheduled')) AS active_campaigns,
    (SELECT count(*)::int FROM visible_blocked) AS blocked_numbers
)
SELECT jsonb_build_object(
  'range', jsonb_build_object('start', (SELECT start_day FROM range_ts), 'end', (SELECT end_day FROM range_ts), 'tz', 'Asia/Dhaka'),
  'devices', counts.devices,
  'devicesOnline', counts.devices_online,
  'brands', counts.brands,
  'brandUsers', counts.brand_users,
  'campaigns', counts.campaigns,
  'activeCampaigns', counts.active_campaigns,
  'blockedNumbers', counts.blocked_numbers,
  'totalMessages', coalesce(ct.total,0) + coalesce(at.total,0),
  'delivered', coalesce(ct.delivered,0) + coalesce(at.delivered,0),
  'failed', coalesce(ct.failed,0) + coalesce(at.failed,0),
  'pending', greatest(coalesce(ct.total,0) - coalesce(ct.delivered,0) - coalesce(ct.failed,0), 0),
  'todayMessages', (
    SELECT coalesce(sum((value->>'delivered')::int + (value->>'failed')::int + (value->>'pending')::int), 0)
    FROM jsonb_array_elements(coalesce(series.data, '[]'::jsonb)) value
    WHERE value->>'date' = to_char((now() AT TIME ZONE 'Asia/Dhaka')::date, 'YYYY-MM-DD')
  ),
  'series', coalesce(series.data, '[]'::jsonb),
  'topDevices', top_devices.data
)
FROM counts, campaign_totals ct, activity_totals at, series, top_devices;
$function$;

CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.get_dashboard_stats_for_user(auth.uid(), NULL, NULL);
$function$;
