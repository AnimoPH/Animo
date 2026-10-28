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

## Weather forecast (farmer advisories)

The `refresh-advisory` edge function fetches the rain forecast from **OpenWeatherMap** (`/data/2.5/forecast`, 3-hour slots) for one fixed point, Antipolo (14.5842, 121.1763), and writes a row to `weather_forecast_feed`. A rain rate of at least **7.5 mm/h** (PAGASA Yellow warning level) anywhere in the 24-48 h window means rain is expected, and `decideAdvisory` turns that plus crop ripeness into Advance Cut, Delayed Harvest or No Action Needed. The rule lives in `supabase/functions/_shared/advisory-rule.ts`.

- **Key:** set the `OPENWEATHERMAP_API_KEY` edge function secret. It is not an Expo variable.
  - Hosted: `npx supabase secrets set OPENWEATHERMAP_API_KEY=...`
  - Local: add `OPENWEATHERMAP_API_KEY=...` to the file you pass to `npx supabase functions serve --env-file ...`
- **Schedule:** pg_cron calls the function every 6 hours (migration `0025`). It needs the `advisory_refresh_service_role_key` and `advisory_refresh_function_url` Vault secrets, created once as described in that migration.
- **Without a key** (or when OpenWeatherMap fails) the function logs the error and repeats the last row with `is_stale=true` instead of going silent. A fresh local database only has the seed row (0 mm, no rain).
- **Manual run:** `curl -X POST <API_URL>/functions/v1/refresh-advisory -H "Authorization: Bearer <SERVICE_ROLE_KEY>"`
- **Demo without real rain:** `scripts/advisory-demo.sh` (see the header of that file).

## Expo template leftovers

`npx expo start` still works as usual (Expo Go, emulator, web). Do not run `npm run reset-project` on this repo — that is create-expo-app scaffolding, not ANIMO.
