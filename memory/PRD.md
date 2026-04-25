# Monican Recharge — PRD

## Original problem statement
Build "Monican Recharge" at `recharge.monican.shop` — a professional mobile top-up sub-platform of `monican.shop`. Tagline: "Voye Recharge — Rapid, Fasil, Kote ou Ye". Send airtime + data plans to Haiti (Digicel, Natcom) and 150+ countries via Reloadly, with Stripe + Moncash payment. Brand: dark/black + emerald green + gold. Multi-language EN/FR/ES/KR (synced with monican.shop via shared `monican_lang` localStorage key).

## User explicit choices (verbatim)
- "fè li ak next.js jan m mande a" — must be Next.js 14
- "mwen pako gen kont reloadly map fe l i aprè" — Reloadly keys later (mock now)
- "projet monican nan gen stripe deja map itilizel" — using existing Monican Stripe (will plug keys later)
- "email/password ett google oauth (optionel)" — both auth methods
- "map mete tout api key yo aprè" — will plug all keys later

## Architecture (date: 2026-04-25)
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind + Phosphor Icons + Framer Motion + sonner. Replaces the original CRA template at `/app/frontend`.
- **Backend**: FastAPI (`/app/backend/server.py`) + MongoDB (`tranzaksyon` collection). Hosts all `/api/*` endpoints because the Emergent K8s ingress routes `/api/*` exclusively to FastAPI:8001.
- **Auth**: Supabase (`@supabase/ssr`) — client wired in `lib/supabase/{client,server}.ts`. When `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` are empty (current state), `createClient()` returns `null` and pages render a yellow "Supabase not configured" warning.
- **Recharge**: Reloadly is **MOCKED** in FastAPI (`OPERATORS`, `DATA_PLANS`, `detect_operator`). Replace with real Reloadly SDK once `RELOADLY_CLIENT_ID/SECRET` are added.
- **Stripe**: env vars are placeholders. The "Pay with card" path returns mock success (no real charge) until keys are plugged in.
- **Local fallback**: `lib/store.ts` mirrors transactions/contacts in `localStorage` so dashboard/history/contacts demo work without auth.

## Personas
- **Diaspora sender** (US/CA): tops up family in Haiti, pays by card.
- **Local Haitian user**: tops up own line, pays via Moncash.
- **Cashier / sub-agent** (future): commission-based hierarchy (deferred to P1).
- **Admin** (future): manages Reloadly balance, confirms Moncash manual payments (deferred to P1).

## Implemented features (v1 — 2026-04-25)
- **Landing `/`**: dark→green hero with bg image + radial gradient + noise, "⚡ Recharge Instantane" badge, gradient title, trust badges row, central recharge form, How-It-Works 3 steps, operator logos grid (grayscale → color on hover), CTA card, footer linking to monican.shop.
- **Recharge form (4-step)**: operator cards → phone with country flag dropdown + auto-detect → airtime/data tabs with quick-amount + HTG conversion + popular plans → summary + payment method selector + submit. Animated step transitions, full keyboard support, all `data-testid`s.
- **Auth pages**: `/konekte` (login) and `/enskri` (signup) with email/password + Google OAuth (disabled when Supabase keys missing).
- **Dashboard `/tableau-de-bord`**: greeting with user name, "Total Sent" + tx count stats, embedded quick recharge form, saved contacts grid, recent transactions list with status badges.
- **History `/istwa`**: full transaction table, search by phone/operator, status filters (All/Success/Pending/Failed), CSV export.
- **Contacts `/kontak`**: add/list/delete saved contacts with auto-detect operator on save, quick-recharge button per contact.
- **i18n**: 4-language toggle (EN/FR/ES/KR) wired across all pages, persisted in shared `monican_lang` localStorage key (synced with monican.shop).
- **API endpoints (FastAPI `/api/*`)**:
  - `GET /api/reloadly/operators`
  - `POST /api/reloadly/auto-detect`
  - `GET /api/reloadly/data-bundles?operatorId=`
  - `POST /api/recharge/send` (mocks Reloadly, persists to Mongo `tranzaksyon`)
  - `GET /api/recharge/transactions`

## Backlog (priority-ordered)
### P0 — needed before public launch
- Plug real **Supabase** project (URL + anon + service role) and run schema (profils, tranzaksyon, kontak_sove, peman_moncash, balans_reloadly + RLS).
- Plug real **Reloadly** keys → switch FastAPI mock to real Reloadly SDK with token caching (1h TTL).
- Plug real **Stripe** keys + create payment intent endpoint + webhook handler that calls `/recharge/send` only after `payment_intent.succeeded`.
- Wire Supabase persistence in `RechargeForm` (write to `tranzaksyon` table, read on dashboard/history) so logged-in users sync across devices.

### P1
- **Sub-agent / cashier hierarchy** (`ajan_id`, `kasiè_id`, commission split) and admin role.
- **Moncash manual payment** flow with screenshot upload and admin confirmation queue (`peman_moncash` + storage bucket).
- **WhatsApp/SMS confirmation** to sender after successful recharge (Twilio or WhatsApp Business API).
- Admin dashboard: Reloadly balance log, refund automation when Reloadly fails, daily P&L.
- Saved-contact deep link: clicking a contact card prefills RechargeForm via URL param `?phone=&operatorId=`.

### P2
- Country picker with full 150+ flags & dial codes (currently 4: HT/US/CA/DO).
- Promotions endpoint (`/operators/{id}/promotions`) and bonus banners.
- Loyalty points / referral program.
- Apple Pay / Google Pay surfaces in Stripe.

## Next action items (immediate)
1. Provide Supabase + Reloadly + Stripe keys to enable real flows.
2. Apply DB schema + RLS in Supabase.
3. Confirm font choice (currently Cabinet Grotesk + Manrope via Fontshare CDN).
