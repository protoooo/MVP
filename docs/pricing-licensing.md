# ProtocolLM Pricing, Licensing, and Checkout Architecture (Dec 2025)

This document defines a minimal, scalable pricing and licensing approach for ProtocolLM (image + text food-safety compliance tool) serving single-location restaurants, franchises, and enterprises.

## 1) Recommended Pricing Strategy (simple mental model)
- **Hybrid per-location with included devices**: each paid location includes a fixed device allowance; extra devices are add-ons.
- **Suggested public pricing** (defaults; should come from a pricing config table/env so sales can update without code):
  - **Single location**: **$39/location/month** includes **2 devices**, unlimited scans. Additional devices: **$10/device/month**.
  - **Small franchise (3–9 locations)**: **$35/location/month** includes 2 devices. Additional devices: **$8/device/month**.
  - **Enterprise (10+ locations or custom terms)**: **$29–$33/location/month** with negotiated device packs and annual/quarterly billing; optionally include **3 devices** per location to reduce procurement friction (explicitly configurable per deal).
- **Rationale**: per-location is intuitive for operators; device add-ons keep fairness for high-usage sites without per-scan complexity. Pricing stays in the $30–$50 band for small restaurants while scaling down for volume.
- **Trial & free usage**: keep 14-day free trial + limited free usage (N scans/day) on unlicensed locations to drive adoption.
> Default inclusion is 2 devices/location; enterprise can optionally move to 3 included devices via config to simplify rollout. Document deviations in the pricing config table.
> Current implementation still charges $50/location via `PRICE_PER_LOCATION` in `create-multi-location-checkout`. When adopting this model, update the config/Price ids (or that constant) and keep a transition note for legacy customers.
- **Pricing migration (high level)**: 
  1) Create new Stripe Prices (do **not** delete the $50 Price). 
  2) Ship a feature flag to switch the checkout route to the new Price ids for new customers only. 
  3) Offer existing customers a migration path at renewal (prorate or move at period end). 
  4) After 100% traffic cutover, deprecate the $50 default but keep compatibility handling for legacy subs.

## 2) Purchasing scenarios coverage
- **Single restaurant, 1–3 devices**: buy one location, choose devices (default 2 included, optionally +1 device add-on).
- **Single restaurant, many devices**: same checkout, increase device add-on quantity.
- **Franchise owner, multiple locations**: select number of locations, choose devices per location (or average devices → total devices derived).
- **Enterprise buyer, dozens of locations with varied device counts**: bulk location quantity + device packs quantity; enterprise sales can adjust prices via Stripe Price overrides or custom Prices.
- **Centralized purchaser managing access**: purchaser owns the subscription; locations and device entitlements are provisioned under the organization with delegated managers per location.

## 3) Data model (Supabase/Postgres)
- **organizations**: `id (uuid)`, `name`, `stripe_customer_id`, `owner_user_id`, `plan_tier`, `billing_email`.
- **locations**: `id`, `organization_id`, `name`, `address`, `timezone`, `status`, `external_ref` (for enterprise mapping).
- **devices**: `id`, `location_id`, `organization_id`, `device_label`, `status`, `last_seen_at`, `auth_token_hash`.
- **licenses/entitlements** (per org): `id`, `organization_id`, `location_limit`, `included_devices_per_location`, `extra_device_allowance`, `subscription_id`, `subscription_item_id`, `trial_ends_at`, `renewal_period`, `status`.
- **stripe_customers**: `organization_id`, `stripe_customer_id`.
- **subscriptions**: `id`, `organization_id`, `stripe_subscription_id`, `status`, `current_period_end`, `cancellation_effective_date`.
- **subscription_items**: `id`, `subscription_id`, `stripe_price_id`, `quantity`, `type` (`location_base`, `device_addon`), `unit_amount`.
- **invites/access**: `id`, `organization_id`, `location_id`, `role`, `invite_code`, `status`.

> Users are only needed for admin/purchaser and delegated manager roles; pricing/enforcement is device/location based (no per-user metering).
> Existing tables like `pending_multi_location_purchases` and invite codes can map into this model: each pending purchase creates an `organization` plus `locations` seeded from the invite set. Add migration scripts before removing the legacy tables.
> Migration details: backfill `organizations` from distinct buyers, map `pending_multi_location_purchases` → `locations` (respect invite codes), then create `subscriptions`/`subscription_items` rows from active Stripe subscriptions. Validate counts (`location_limit`, invites length) and keep a rollback script to restore the previous schema snapshot if counts mismatch.

## 4) Pricing choice & enforcement (comments)
- **Hybrid per-location + device add-on** keeps procurement simple and fair for high-device sites; avoids per-scan metering.
- **Users**: do **not** meter by user; only use users for auth/audit.
- **Unlimited usage enforcement**: gate all API actions by device entitlement:
  - Device presents a signed token tied to `device_id` and `location_id`.
  - Middleware checks active subscription, `location_limit`, and `included_devices_per_location + extra_device_allowance`.
  - Deny or soft-limit if device exceeds allowance for the location.

## 5) Stripe setup
- **Products**:
  - `protocolLM_location_base` (recurring monthly & annual Prices; trial capable).
  - `protocolLM_device_addon` (recurring monthly & annual).
- **Prices**:
  - Public: `location_base_monthly_standard` @ $39 with 2 devices included (in metadata).
  - Tiered/volume Prices for 3–9 and 10+ locations (use graduated pricing on the same Price where possible; otherwise separate Prices keyed by tier). **Tier breakpoints and rates should be config-driven (env or pricing table) so sales can adjust without code changes (e.g., `franchise_min=3`, `franchise_max=9`, `enterprise_min=10`).**
  - `device_addon_monthly` @ $10 (standard) and $8 (franchise/volume).
- **Quantities**:
  - `location_base` quantity = number of locations.
  - `device_addon` quantity = total devices beyond included allowance (computed).
- **Metadata** on Checkout Session & Subscription: `org_id`, `org_name`, `location_count`, `total_devices`, `included_devices_per_location`, `extra_devices`, `created_by_user_id`, `pending_purchase_id`, `plan_tier`, `source` (web/multi-location form).

## 6) Checkout UX rules
- Single flow lets buyer set **location count** and either:
  - specify **devices per location** (one number) or
  - pick **tiers**: “Standard (2 devices incl.)”, “High-traffic (4 devices incl.)”.
- Render derived totals: `location_count × price` + `extra_devices × addon_price`.
- For large buys, keep one Stripe Checkout session (no per-location loops); collect billing address & tax IDs.
- Promotion codes allowed; display estimated monthly total and per-location effective rate.

## 7) Webhook provisioning (pseudocode)
```javascript
// On checkout.session.completed or customer.subscription.updated
const session = event.data.object
const sub = await stripe.subscriptions.retrieve(session.subscription, { expand: ['items'] })
const orgId =
  session.metadata.org_id ||
  await lookupOrgFromPending(session.metadata.pendingPurchaseId)
// fallback to legacy flow; validate that the pending purchase maps to an org stub before proceeding
const locCount = Number(session.metadata.location_count)
const includedPerLoc = Number(session.metadata.included_devices_per_location || 2)
const extraDevices = Number(session.metadata.extra_devices || 0)
const totalDeviceEntitlements = includedPerLoc * locCount + extraDevices

await db.transaction(async (tx) => {
  await tx.upsert('subscriptions', {
    organization_id: orgId,
    stripe_subscription_id: sub.id,
    status: sub.status,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
  })
  await tx.upsert('licenses', {
    organization_id: orgId,
    location_limit: locCount,
    included_devices_per_location: includedPerLoc,
    extra_device_allowance: extraDevices,
    subscription_id: sub.id,
    status: 'active',
  })
  await ensureLocations(tx, orgId, locCount) // idempotently create/activate location slots + invite codes; handle downsize by marking extras inactive
  await allocateDeviceSlots(tx, orgId, totalDeviceEntitlements) // ensure enough device entitlements; disable overage devices on downgrade
})
```
- **ensureLocations(tx, orgId, locCount)**:
  - create missing location rows + invite codes up to `locCount`
  - reactivate inactive ones, mark surplus inactive (no hard delete) when downsizing
  - raise `LocationConflictError` (custom class) on conflicting external refs; webhook logs + alerts and marks provisioning `failed` while leaving the sub active
- **allocateDeviceSlots(tx, orgId, totalDevices)**:
  - guarantee `totalDevices` active entitlements; revoke tokens on downgrade
  - return disabled device IDs
  - throw `DeviceAllocationError` (custom class) on failure so the webhook can roll back and retry
> `LocationConflictError` should include fields like `external_ref`, `existing_location_id`, and a machine-readable `code` (e.g., `LOCATION_EXTERNAL_REF_CONFLICT`). `DeviceAllocationError` should include `device_ids`, `requested_total`, `available_total`, and `code` (e.g., `DEVICE_SLOT_SHORTAGE`) for alerting and retries.
> The current webhook flow provisions locations from `pending_multi_location_purchases` and invite codes. The above helpers represent the target state; implement them incrementally and keep compatibility with the existing invite-based provisioning until data is migrated.

## 8) Adding locations/devices later
- **Add locations**: update subscription item quantity for `location_base`; webhook updates `location_limit` and creates new location invite codes.
- **Add devices**: update quantity of `device_addon`; webhook adjusts `extra_device_allowance`.
- **Downgrade/cancel**: schedule at period end; enforce allowlist by disabling devices above new allowance.

## 9) Enterprise controls
- Support **annual terms** (separate annual Prices), **min commits**, and **price overrides** via custom Stripe Prices.
- Allow external references on `locations` for ERP mapping and import CSV of locations → pre-provisioned invites.
- Centralized purchaser remains owner; delegate `location_manager` role for day-to-day device management.

## 10) Implementation hints for current codebase
- Reuse existing multi-location checkout route (`app/api/create-multi-location-checkout/route.js`):
  1) Add request params: `devicesPerLocation` (default 2) or `extra_devices`.
  2) Update pricing calc: derive `extra_devices = max(0, devicesPerLocation - included) * locationCount`.
  3) Modify Stripe line items: include base Price (quantity = `locationCount`) and optional device add-on Price (quantity = `extra_devices`).
  4) Add compatibility layer: when the new Prices are not configured, fall back to the current single line item (`PRICE_PER_LOCATION` * locations) and existing metadata (`userId`, `pendingPurchaseId`).
- Store `subscription_items` rows per Stripe item id to track quantities for audit.
- Device auth middleware should check `licenses.location_limit` and device allocations before serving scans.

## 11) Why this stays simple
- One mental model (“locations with included devices”) fits all segments.
- Stripe Checkout remains single-step; no per-location repetition.
- Unlimited usage preserved while preventing uncontrolled device sprawl via entitlement checks.
