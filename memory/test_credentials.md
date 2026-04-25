# Test Credentials — Monican Recharge

## Auth (Supabase)
**Status:** NOT CONFIGURED — user said they will add Supabase keys later.
- `NEXT_PUBLIC_SUPABASE_URL` is empty in `/app/frontend/.env`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is empty in `/app/frontend/.env`
- Login/signup pages will display a yellow warning banner explaining keys are missing.
- The app is fully demonstrable WITHOUT auth — recharge form works in demo/mock mode and stores transactions/contacts in localStorage so dashboard, history, and contacts pages display real data after using the form.

## Reloadly
**Status:** MOCKED — keys not provided yet.
- All Reloadly endpoints (auto-detect, operators, data-bundles, send-topup) return realistic mock data via Next.js API routes at `/api/reloadly/*` and `/api/recharge/send`.

## Stripe
**Status:** Placeholder env vars only. User will plug in keys from existing Monican project.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is empty.
- The "Pay with card" option in the recharge form does NOT actually charge — it triggers the mock recharge endpoint which always returns success.

## How to test the full flow without keys:
1. Open `/` (landing). Click a Haiti operator card.
2. Country defaults to HT (+509). Enter phone like `34123456` — operator auto-detects.
3. Click Continue. Select airtime amount $10 (or pick a data plan).
4. Click Continue. Pick payment method (Stripe or Moncash). Click "Voye Recharge Kounye a".
5. Wait ~700ms — toast shows success. Redirected to `/tableau-de-bord` showing the transaction.
6. Navigate to `/istwa` — see transaction in history with filters.
7. Navigate to `/kontak` — add a contact (e.g. "Manman", HT, 34111111). It saves locally.

## Test phone numbers
- Haiti Digicel: `34123456`, `41234567`
- Haiti Natcom: `36123456`, `33999999`
