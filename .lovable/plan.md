
## What we're building

A full clone of "WA Notifier" — a multi-tenant dashboard for sending WhatsApp messages in bulk through the `whatsapp.bdwebs.com` API. Workspace owners manage brands, brands own devices (each storing its own API secret + device unique id), users are scoped to brands, and campaigns send templated messages to target groups with anti-ban controls.

## Modules (matches old app sidebar)

1. **Auth** — email/password sign-in; first user = workspace admin
2. **Dashboard** — KPI cards (devices, brands, brand users, campaigns, active, blocked), delivery rate, 14-day volume chart, delivery breakdown donut
3. **Devices** — CRUD; fields: name, device unique id, SIM, linked brand, API secret, status. "Test connection" pings bdwebs `/api/get/credits`
4. **Brands** — CRUD; status (active/suspended/expired), expiry date, msg limit, device limit; activate/suspend actions
5. **Users** — invite users, assign to a brand, role (brand admin / sender)
6. **Contacts & Groups** — per-brand contacts (name, phone, tags) and target groups
7. **All Campaigns** — list, status (scheduled/running/completed/cancelled), Retry Failed / Retry Skipped actions
8. **Create Campaign** — brand, target group, template with `{{name}}` + spintax `{Hi|Hello|Hey}`, Safe vs Direct mode, Safety 1 vs Safety 2, min/max delay, daily limit, schedule
9. **Send SMS** — single message form (device, phone, message)
10. **Message Logs** — per-message status, filter by brand/device/date, search
11. **Blocked Numbers** — block list per brand
12. **Activity Log** — audit of user actions

## Tech approach

- **DB (Supabase)**: tables `profiles`, `app_role` enum + `user_roles`, `brands`, `brand_members`, `devices`, `contacts`, `contact_groups`, `contact_group_members`, `campaigns`, `campaign_messages`, `blocked_numbers`, `activity_log`. RLS scoped via `has_role()` + brand membership helper functions.
- **API calls**: per-device `api_secret` stored in DB. All bdwebs calls go through `createServerFn` handlers (never from the browser) — `sendSms`, `getCredits`, `getCampaigns`, etc.
- **Bulk sending engine**: a `runCampaign` server fn iterates the target group, respects min/max delay, daily limit, sending window (9AM–9PM BD time), warmup ramp, duplicate detection, auto-pause on >20% failure, cooldowns. Writes per-recipient rows to `campaign_messages` with status (queued/sent/delivered/failed/skipped/blocked).
- **Scheduled campaigns**: a `/api/public/cron/tick` route called by pg_cron every minute to advance running campaigns and start scheduled ones.
- **UI**: TanStack Start file routes under `_authenticated/` (managed gate), shadcn sidebar, recharts for analytics, "modern refresh" of the green accent (light + subtle gradients, dark-mode-ready tokens).

## Build order (phases)

I'll ship in phases so each step is verifiable rather than one giant drop:

- **Phase 1 (this turn)**: Auth + schema + roles + Dashboard shell + Devices module (CRUD + test-connection to bdwebs) + Send SMS (single) wired end-to-end. This proves the API integration works.
- **Phase 2**: Brands, Users, Contacts/Groups.
- **Phase 3**: Campaigns (create, list, send engine, retry).
- **Phase 4**: Message Logs, Blocked Numbers, Activity Log, scheduled campaigns via cron.

## Notes & assumptions

- The bdwebs PDF is 88 pages; first 50 were parsed and confirm endpoints `/api/get/credits`, `/api/get/earnings`, `/api/send/sms`, `/api/get/sms.campaigns`, etc. I'll wire the most common ones first and add others as needed in later phases.
- API secret is **per-device** and stored in DB (RLS-protected; never sent to the browser — server fns read it).
- "Brand users" = users that can only act inside a single brand. Workspace owner sees everything.
- No need to add bdwebs as a project secret — secrets live on the `devices` row.
