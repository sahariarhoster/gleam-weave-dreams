## WooCommerce Plugin Integration — Plan

Big feature. Splitting into two deliverables: (A) backend/portal in this app, (B) WordPress plugin (separate PHP codebase, delivered as a downloadable zip).

### A. Lovable app changes

**1. DB (new migration)**
- `plugin_licenses` table:
  - `id uuid pk`, `brand_id uuid fk brands (unique)`, `license_key text unique`, `status text` (active/revoked), `device_id uuid fk devices null`, `site_url text null`, `activated_at timestamptz null`, `last_seen_at timestamptz null`, `created_by uuid`, `created_at`, `updated_at`
- `system_settings` table (singleton row) with `licenses_per_brand int default 1` — admin can change limit later. (Schema supports >1 by removing unique on brand_id later; for now enforce in code.)
- RLS:
  - owner: all access
  - brand_owner / brand_member: select own brand licenses; brand_owner can insert/update for own brand
- GRANTs for authenticated + service_role.

**2. Server functions (`src/lib/licenses.functions.ts`)**
- `listMyLicenses` — list licenses for brands the user owns/is member of
- `generateLicense({ brand_id })` — brand owner generates 1 per brand (respecting limit)
- `revokeLicense({ id })`
- `setLicenseLimit({ limit })` — owner only

**3. Public API routes (called by WP plugin)** under `src/routes/api/public/plugin/`
- `POST /api/public/plugin/activate` — body: `{ license_key, site_url }` → validates, marks active, returns `{ brand_id, brand_name }`
- `GET /api/public/plugin/devices?license_key=...` — returns devices belonging to that brand (id, name)
- `POST /api/public/plugin/select-device` — `{ license_key, device_id }` → persist
- `POST /api/public/plugin/send` — `{ license_key, recipient, message }` → sends WhatsApp via the brand's selected device (uses bdwebs server lib)
- `POST /api/public/plugin/heartbeat` — updates `last_seen_at`
- All routes validate license_key with Zod, look up via `supabaseAdmin`, reject if revoked.

**4. UI**
- `src/routes/_authenticated/licenses.tsx` — brand-owner page: list brands → generate license per brand, copy key, revoke, see site_url + last_seen
- `src/routes/_authenticated/admin-settings.tsx` (owner only) — set licenses_per_brand
- Add nav entries in `app-sidebar.tsx`

### B. WordPress plugin (PHP)

Generate a downloadable plugin zip in `/mnt/documents/wa-notifier-woocommerce.zip` containing:

```
wa-notifier-woocommerce/
  wa-notifier-woocommerce.php       (plugin header, bootstrap)
  includes/
    class-api-client.php            (talks to /api/public/plugin/*)
    class-settings.php              (option storage)
    class-wizard.php                (5-step setup wizard)
    class-woocommerce-hooks.php     (order status change handlers)
    class-shortcodes.php            ({first_name},{last_name},{order_id},{total})
  admin/
    dashboard.php
    woocommerce-config.php          (per-status toggle + template)
    admin-config.php                (admin phone + admin templates)
    change-license.php
    test.php
  assets/css/admin.css
  readme.txt
```

Wizard steps mirror request: license → device pick → woo status templates → admin templates → test send.

Woo statuses covered: pending, processing, on-hold, completed, cancelled, refunded, failed. Each: toggle off by default, textarea with template using shortcodes `{first_name} {last_name} {order_id} {total} {status}`.

### Technical notes
- API base URL configurable in plugin (defaults to this app's published URL).
- License key format: `WAN-XXXX-XXXX-XXXX-XXXX` (random uppercase).
- Public endpoints rely on license_key as bearer; no PII returned beyond brand name + device list of the owner's brand.
- Existing `sendSingleMessage` logic refactored: extract pure helper into `bdwebs.server.ts` call already exists; the public send route reuses it.

### Out of scope (ask later)
- Per-license rate limiting / quotas
- Multi-site per license
- License expiry dates
- Plugin auto-update server

Proceed?