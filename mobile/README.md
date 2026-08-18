# ANIMO mobile

Expo app (farmer / buyer). Auth, listings, purchase requests, and prices live in **Supabase**. The LSTM/GRU service is a **separate** Docker app under `../pricing` — this client never calls it.

## Two ways to run

| | Database | Price model | When to use |
|---|---|---|---|
| **Hosted** | `EXPO_PUBLIC_SUPABASE_URL=https://….supabase.co` | Not on your laptop. Listings use whatever `marketpricefeed.dry_base` is already in the cloud (often the ₱18.83 seed). | UI against shared team data |
| **Local (full stack)** | `http://127.0.0.1:54321` | Docker + edge functions + one curl sync/refresh | Testing listings **and** the model together |

**Hosted Expo will not pick up Docker on your machine.** Cloud Postgres cannot reach `localhost:8000`.

For local DB + model + app, follow **[../pricing/README.md](../pricing/README.md)** (start order, keys, `.env`, smoke test). That is the source of truth for the pricing loop.

## Quick start (app only, hosted or already-running local)

```bash
cd ~/Desktop/Animo/mobile
cp .env.example .env   # then fill URL + anon key
npm install
npx expo start
```

- **Hosted:** paste the team project URL and anon JWT from the Supabase dashboard.
- **Local:** after `npx supabase start`, run `npx supabase status -o env` and copy `API_URL` + `ANON_KEY` (the `eyJ…` anon JWT, not `sb_publishable_…`).

Restart Expo after every `.env` change.

Physical phone: `127.0.0.1` is the phone. Use your PC’s LAN IP and port `54321`, or an emulator alias (`10.0.2.2` on Android). Details in the pricing README.

Local Auth has no hosted users. Register again (or seed) on local Postgres. `EXPO_PUBLIC_DEV_*` accounts only work if those users exist in **this** project.

## Layout

- `src/app/` — Expo Router screens
- `src/services/` — Supabase client calls (listings, marketplace, purchase requests)
- `supabase/migrations/` — schema (apply with local `supabase start` / `db reset`, or `db push` to hosted)
- `supabase/functions/` — OTP, registration, PSA sync, `refresh-dry-base` (needs `PRICING_SERVICE_URL` when serving)

## Expo template leftovers

`npx expo start` still works as usual (Expo Go, emulator, web). Do not run `npm run reset-project` on this repo — that is create-expo-app scaffolding, not ANIMO.
