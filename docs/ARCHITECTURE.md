# ID·SPACE FINANCE V2 — Architecture & Foundation Audit

> Status honesty rule: this document marks each subsystem as **PRODUCTION**,
> **BETA** (works, incomplete hardening) or **PROTOTYPE** (local/demo only).
> Nothing is described as production-ready unless it is.

## 1. Stack

- React 19 + TypeScript + Vite 7, TanStack Start (SSR + server functions) and TanStack Router.
- Tailwind CSS v4 via `src/styles.css` (Islamic Green + Metallic Gold dark/luxury theme).
- Supabase (Lovable Cloud) for auth, database, RLS.
- Pi Network SDK (Pi Browser) for authentication and Pi payments.
- TanStack Query for server-function data fetching.

## 2. Routing

Public routes: `/`, `/wallet`, `/swap`, `/staking`, `/checkin`, `/marketplace`,
`/entertainment`, `/premium`, `/community`, `/notifications`, `/profile`,
`/terms`, `/privacy`, `/auth`.
Protected: `src/routes/_authenticated/*` (`/admin`, `/admin-config`) behind the
managed auth gate.
HTTP endpoints: `src/routes/api/**` — Pi auth (`/api/auth/pi`), Pi payment
lifecycle and reconciliation under `/api/public/pi/*`, market data
`/api/public/rates`, MCP endpoints.

## 3. Identity — single source of truth (PRODUCTION)

`src/lib/account-store.ts` → `useAccount()`.

- Reads the browser Supabase session, then `getMyAccount()` (server fn behind
  `requireSupabaseAuth`, so RLS scopes everything to `auth.uid()`).
- Returns display name, username, membership, roles (`admin` / `moderator` /
  `user`) and the ledger-backed wallet balances.
- When no session exists it returns a neutral **guest** state.
- No screen may hardcode a user. The old `"Rocky San" / @rocky.san.pi /
  IDPI-20250001` values were removed from the sidebar and profile page; the
  remaining object in `src/routes/profile.tsx` is a neutral placeholder shape
  that is fully overwritten once a session exists.

Roles come from `public.user_roles` + `has_role()` / `is_admin()` /
`is_moderator()` security-definer functions. There is no email-based admin check.

## 4. Wallet & Ledger (PRODUCTION, backend-enforced)

- Balances live in `public.wallets`; a `guard_wallet_balance` trigger rejects any
  direct balance update.
- All balance movement goes through `post_ledger_entry()` /
  `settle_ledger_entry()` security-definer RPCs, so every change has a ledger row.
- The frontend only *displays* balances from the wallet row.
- **PROTOTYPE:** `src/lib/idpoints-store.ts` is a localStorage IDPoints/check-in
  ledger used by staking, swap history and check-in UI. It is device-local and is
  NOT the authoritative balance. Profile/sidebar now prefer the Supabase wallet
  when signed in.

## 5. Market data — one centralized service (PRODUCTION)

```
/api/public/rates  (server proxy: OKX PI-USDT + open.er-api.com USD/IDR)
        |
  src/lib/market-store.ts  (useMarket(), 60s refresh, localStorage cache)
        |
  Home · Swap · Pi Converter · (future Marketplace / Booking / Services)
```

Rules implemented:

- Exactly one fetch source. The Pi Converter previously called
  `https://www.okx.com/...` directly from the browser (blocked by CORS in the
  preview and on mobile) and kept its own divergent price — it now consumes
  `useMarket()`.
- No invented fallback price. Until a real quote arrives `piUsd`/`usdIdr` are
  `0` and the UI renders `--`. Hardcoded `0.089135`, `0.642135`, `19906`
  fallbacks were removed.
- If the API fails, the last valid cached quote is shown with `online: false` /
  `stale: true` and an "Offline (cached)" badge plus the quote timestamp.

## 6. Pi Network (BETA)

- SDK init + `authenticate(["username","payments"])` in `src/lib/pi-auth.tsx`.
- Access token validated server-side against `https://api.minepi.com/v2/me`
  using `PI_VALIDATION_KEY` from the encrypted `app_secrets` vault
  (`src/lib/app-secrets.server.ts`), never from the client.
- Validated Pi accounts are bridged to real Supabase auth users
  (`src/lib/pi-identity.server.ts`) so RLS and roles apply.
- Payment lifecycle: `approve` → `complete` / `incomplete` routes persist
  `transactions` and `pi_payment_events`; statuses are distinct
  (`pending`, `approved`, `completed`, `cancelled`, `failed`).
- `src/lib/pi-reconcile.server.ts` + `/api/public/pi/reconcile` (apikey-gated)
  re-verify open payments against the Pi API idempotently.
- **Limitation:** mainnet has not been exercised end-to-end here. `PI_SANDBOX`
  must be set to `false` and `PI_NETWORK_API_KEY` / `PI_VALIDATION_KEY` must hold
  mainnet credentials before any payment is treated as settled money.

## 7. Security posture

- `SUPABASE_SERVICE_ROLE_KEY` is only reachable through
  `src/integrations/supabase/client.server.ts`, imported inside server handlers.
- Pi credentials are stored AES-256-GCM encrypted in `app_secrets` (RLS on, no
  policies → service role only) and are never returned to the client.
- RLS: user-owned tables scope to `auth.uid()`; moderators get CMS tables
  (`banners`, `running_text`, `notifications`, `missions`) plus read access to
  logs/transactions; `wallets` has no write policy by design.

## 8. Known limitations / still demo

- Staking, swap execution, marketplace items, entertainment and community are
  client-side/localStorage prototypes — no server settlement yet.
- Sidebar "Missions", "Hangar" and "Settings" entries are placeholders (kept
  intentionally, no navigation target yet).
- `/admin/*` sidebar sub-routes from the dashboard plan are not built; `/admin`
  and `/admin-config` exist.

## 9. Future ecosystem — RECOMMENDATION ONLY (not created)

Nothing below exists yet; the current schema does not block it.

| Domain | Suggested tables |
| --- | --- |
| Providers | `providers`, `provider_members` |
| Catalog | `categories`, `listings`, `listing_images` |
| Property & Stay | `properties`, `property_availability` |
| Booking | `bookings` (check-in/out, status, cancellation) |
| Services | `services`, `service_packages` |
| Universal Order | `orders`, `order_items` (product / booking / service in one model) |
| Trust | `reviews` |

Universal Order concept: every commerce flow creates one `orders` row, links to
`transactions` (Pi payment), produces `ledger` entries for IDPoints/cashback, and
emits a `notifications` row. Payments continue to flow through the existing Pi
approve/complete/reconcile pipeline — no parallel money path.
