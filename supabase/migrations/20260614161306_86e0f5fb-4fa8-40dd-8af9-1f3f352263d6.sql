
SELECT cron.alter_job(
  job_id := 1,
  command := $$SELECT net.http_post(
    url := 'https://wasuite.hostercamp.com/api/public/cron/tick',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );$$
);

SELECT cron.alter_job(
  job_id := 2,
  command := $$SELECT net.http_post(
    url := 'https://wasuite.hostercamp.com/api/public/cron/daily-report',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );$$
);
