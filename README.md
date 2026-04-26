# Monican Recharge

Voye Recharge — Rapid, Fasil, Kote ou Ye.

A professional mobile top-up platform — sub-platform of [monican.shop](https://monican.shop). Send airtime + data plans to Haiti (Digicel, Natcom) and 150+ countries via Reloadly.

## Stack

- **Application**: Next.js 14 (App Router) + TypeScript + Tailwind + API Routes (`/app/api/*`)
- **Données**: MongoDB optionnelle (`MONGO_URL`) pour la collection `tranzaksyon`
- **Auth**: Supabase (`@supabase/ssr`) — email/password + Google OAuth
- **Payment**: Stripe (cards) + Moncash (mobile money)
- **Recharge API**: Reloadly (mock côté serveur si clés absentes)
- **Languages**: EN / FR / ES / KR (Kreyòl Ayisyen)

## Démarrage

À la racine du dépôt :

```bash
npm install
npm run dev
```

`npm run dev` choisit **automatiquement** le premier port libre entre **3100** et **3999** (plus d’erreur `EADDRINUSE` tant qu’il reste une plage libre). L’URL exacte s’affiche au démarrage dans le terminal.

Plage personnalisée : `DEV_PORT_MIN=4000 DEV_PORT_MAX=4100 npm run dev`.

Ports fixes si tu préfères : `npm run dev:3000`, `dev:3001`, `dev:3100`.

Build production :

```bash
npm run build
npm run prod
```

## Variables d’environnement

Fichier **`.env` à la racine** (modèle : `.env.example`).

Inclut : URL app, Supabase, Reloadly, Stripe, et optionnellement MongoDB pour l’historisation des recharges.

## Pages

- `/` — Landing + formulaire de recharge (4 étapes)
- `/konekte` — Connexion
- `/enskri` — Inscription
- `/tableau-de-bord` — Tableau de bord
- `/istwa` — Historique des transactions
- `/kontak` — Contacts enregistrés

## API (Next.js `/api/*`)

- `GET /api` — statut du service
- `GET /api/reloadly/operators`
- `POST /api/reloadly/auto-detect`
- `GET /api/reloadly/data-bundles?operatorId=`
- `POST /api/recharge/send`
- `GET /api/recharge/transactions`

## License

© 2026 Monican LLC — All rights reserved.
