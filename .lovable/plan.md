# QR Device Linking with API Key Pool

## Goal

Replace the per-device "API Secret" field with a shared pool of API keys. When adding a device, pick one at random, generate a QR (valid ~15s), let the user scan it, poll the infolink to detect completion, then auto-create the device row with the linked WhatsApp number's details.

## Database

New table `wa_api_keys`:

| column   | type     | notes                                |
| -------- | -------- | ------------------------------------ |
| id       | uuid PK  |                                      |
| label    | text     | e.g. "Server 1 — key A"              |
| secret   | text     | the API secret from the panel        |
| sid      | int      | default WhatsApp server id for this key |
| active   | bool     | default `true` — only active keys are picked |
| created_at | timestamptz | default `now()`                |

RLS: owners only (read/write). Service role full access.
Devices keep their existing `api_secret` column — it gets populated with whichever pool key was used at link time, so sending continues to work without lookups.

## Server functions (src/lib/devices.functions.ts)

1. `startDeviceLink({ brand_id })` — owner only
   - Pick a random `active=true` key from `wa_api_keys`.
   - Call `bdwebs.linkWhatsApp({ secret, sid })`.
   - Return `{ qrimagelink, infolink, link_token }` where `link_token` is a short server-side cache key (just return all three URLs + the chosen `secret`/`sid` encoded in a short-lived token). Simpler: return `{ qrimagelink, infolink, secret_id, sid }` and persist the pending session in memory is risky — instead pass `secret_id` + `sid` back to the client and have step 2 re-load the secret server-side.

2. `pollDeviceLink({ infolink, secret_id, sid, brand_id, name, sim_info })` — owner only
   - Fetch `infolink`. If the WhatsApp panel reports "not linked yet", return `{ status: "pending" }`.
   - On success it returns the linked account's unique id and metadata. Insert a `devices` row with `device_unique_id = info.unique`, `api_secret = <secret from pool by id>`, `brand_id`, etc. Return `{ status: "linked", device_id }`.

3. Keep existing `listWaServers` / `linkDeviceQR` for the existing Relink button on already-saved devices (uses the device's own stored secret + unique).

4. New `listApiKeys` / `createApiKey` / `deleteApiKey` / `toggleApiKey` for the settings UI.

## UI

- New page **Settings → API Keys** (owner only): table with label, secret (masked), sid, active toggle, delete; "Add key" dialog.
- **Devices → Add Device** dialog refactored:
  1. Step 1: name, SIM info, brand (no API secret field anymore).
  2. Step 2 (after "Continue"): call `startDeviceLink`, show QR image. Start polling `pollDeviceLink` every 2s.
  3. On `linked`: close dialog, toast success, invalidate `devices` query. On 30s timeout: show "QR expired, try again" with a Regenerate button.
- The existing per-row **Link QR** button stays for relinking and still uses the device's stored secret.

## Technical notes

- Infolink response shape isn't in the docs we have — implementation will treat any JSON with a non-empty `unique` (or `data.unique`) as "linked"; anything else is "pending". If the panel returns a different field, we'll log it once and adjust.
- Polling uses `useQuery` with `refetchInterval` from the client; the server function is idempotent (won't double-insert if called twice — checks for an existing device with the same `device_unique_id` first).
- API secrets are randomized **per link attempt**, not per message. Once a device is linked, it always sends via the same secret it was linked with (this matches how the panel binds an account to the secret that created it).

## Out of scope

- No bulk-import of keys.
- No quota/round-robin tracking — pure random pick is enough for now.
- Sending logic (`sendWhatsApp`, campaigns) unchanged; still uses each device's stored `api_secret`.
