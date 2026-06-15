# Credit-Based Pricing Migration Plan

Shift WA Suite from fixed subscription packages to a credit wallet model, while keeping existing paying customers on their current plans untouched.

## 1. Pricing model overview

Two new packages (admin-editable):
- **SME Pack** — 0.80 tk / credit, min topup ৳500, 3 WP sites, 1 device
- **Corporate Pack** — 0.65 tk / credit, min topup ৳1000, 5 WP sites, 3 devices
- **Trial** — 30 SMS, 1 device, 1 WP site, **once per brand + user lifetime**, auto-converts to credit model on expiry

Credits expire 6 months from topup. A new topup extends ALL existing credit expiry to topup_date + 6 months.

1 delivered SMS = 1 credit deducted (failed sends do NOT deduct). Add-ons (extra device / extra WP license) are separate one-time payments — not deducted from credits.

## 2. Database changes

New tables:
- `credit_packages` — admin-editable: name, tk_per_credit, min_topup_tk, wp_site_limit, device_limit, is_active. Seed SME + Corporate.
- `credit_wallets` — one per brand: brand_id, balance, expires_at, package_id (current tier).
- `credit_transactions` — brand_id, type (topup|deduct|refund|adjustment|expiry), credits, tk_amount, order_id, message_ref, created_at.
- `addon_purchases` — brand_id, type (device|wp_license|combo), price_tk, order_id.

Modify:
- `brands` — add `pricing_model` enum ('legacy_subscription' | 'trial' | 'credits'), `trial_used_at`.
- `orders` — add `kind` enum ('subscription' | 'credit_topup' | 'addon'), `credit_package_id`, `credits_purchased`.
- `system_settings` — add `low_balance_threshold` (default 100), `low_balance_whatsapp_template`.

DB functions:
- `deduct_credit(brand_id, message_ref)` — atomic; throws if balance<1 or expired; pauses campaigns if balance hits 0.
- `topup_credits(brand_id, credits, package_id)` — adds credits, extends expiry of full balance to now()+6mo.
- `expire_credits()` — cron job, zero out expired wallets.
- `can_send(brand_id)` — returns boolean for gate checks.

## 3. Backend logic

- **Trial enforcement**: check `brands.trial_used_at` AND user's brand history before allowing trial order. After 30 SMS or trial end → flip `pricing_model='credits'`, balance=0.
- **Send gating** (cron tick, plugin/send, single send): call `can_send()` first; if false → block with clear error. On successful delivery → `deduct_credit()`.
- **Low balance**: after every deduct, if balance < threshold and no recent notice → send WhatsApp notification to brand admin.
- **Pause on zero**: `deduct_credit` sets all running campaigns to `paused` and inserts a brand-level notice.
- **Legacy users**: brands with `pricing_model='legacy_subscription'` skip credit checks entirely — continue as today.

## 4. Frontend changes

**Public homepage (`/`)**:
- Remove old subscription tiers and trial pricing card.
- Show SME + Corporate credit packs (read from `credit_packages`).
- Trial CTA unchanged but labeled "lifetime once".

**Order page (`/order`)**:
- Replace package selector with: Trial (if eligible) | Topup (SME) | Topup (Corporate) | Add-ons.
- Topup form: choose package + amount (≥ min_topup), shows credits = amount / tk_per_credit.
- Add-on form: separate checkout.

**Dashboard**:
- Credit balance widget (balance, expiry date, low-balance warning).
- Banner when campaigns are paused due to zero credits.

**Admin (`/_authenticated/packages` or new `/credit-packages`)**:
- CRUD for `credit_packages` (tk_per_credit, min_topup, limits).
- Setting for low_balance_threshold and WhatsApp template.
- Manual credit adjustment tool per brand.

**Sidebar/Billing**: show wallet + transactions history.

## 5. Migration / rollout

1. Migration creates tables + functions + seeds SME/Corporate.
2. Mark all current paying brands `pricing_model='legacy_subscription'`.
3. Mark current trial brands `pricing_model='trial'` with `trial_used_at=subscription.start`.
4. New signups default to `pricing_model='trial'` (one-shot) → `credits` after.
5. Old subscription order flow stays in code but unreachable from UI — admin can still see history.

## 6. Order of implementation

1. DB migration (tables, enums, functions, seed, backfill existing brands).
2. Server fns: `topupCredits`, `purchaseAddon`, `getWallet`, `listTransactions`, `adminUpdateCreditPackage`, `adminAdjustCredits`.
3. Send-path gating in cron + plugin + single send.
4. Order page rebuild + homepage pricing rebuild.
5. Dashboard wallet widget + paused-campaign banner.
6. Admin UI for credit packages + settings.
7. Low-balance WhatsApp notifier (cron tick).

## Open confirmations

- bKash payment flow for topups: reuse existing order → bKash → webhook path? (assumed yes)
- Add-on prices stay ৳400 / ৳400 / ৳700 combo from prior discussion? (assumed yes)
- Should admin be able to manually convert a legacy subscriber to credits? (assumed yes, via adjust tool)

Approve and I'll start with step 1 (DB migration).
