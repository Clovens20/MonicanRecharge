# Monican Recharge

Voye Recharge — Rapid, Fasil, Kote ou Ye.

A professional mobile top-up platform — sub-platform of [monican.shop](https://monican.shop). Send airtime + data plans to Haiti (Digicel, Natcom) and 150+ countries via Reloadly.

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind + Phosphor Icons + Framer Motion
- **Backend**: FastAPI + MongoDB (`/app/backend`)
- **Auth**: Supabase (`@supabase/ssr`) — email/password + Google OAuth
- **Payment**: Stripe (cards) + Moncash (mobile money)
- **Recharge API**: Reloadly (currently mocked — plug keys to enable real send)
- **Languages**: EN / FR / ES / KR (Kreyòl Ayisyen)

## Getting started

```bash
# Frontend
cd frontend
yarn install
yarn dev   # next dev -H 0.0.0.0 -p 3000

# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

## Environment variables

`frontend/.env`

```
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RELOADLY_CLIENT_ID=
RELOADLY_CLIENT_SECRET=
RELOADLY_SANDBOX_MODE=true
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

`backend/.env`

```
MONGO_URL=mongodb://localhost:27017
DB_NAME=monican_recharge
CORS_ORIGINS=*
```

## Pages

- `/` — Landing + central recharge form (4 steps)
- `/konekte` — Login (FR/KR)
- `/enskri` — Signup
- `/tableau-de-bord` — User dashboard
- `/istwa` — Transaction history
- `/kontak` — Saved contacts

## API endpoints (FastAPI `/api/*`)

- `GET /api/reloadly/operators`
- `POST /api/reloadly/auto-detect`
- `GET /api/reloadly/data-bundles?operatorId=`
- `POST /api/recharge/send`
- `GET /api/recharge/transactions`

## License

© 2026 Monican LLC — All rights reserved.
