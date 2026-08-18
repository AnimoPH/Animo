# pricing

LSTM/GRU price model + RF/SVR anomaly check for palay prices, wrapped as a FastAPI service. Trained on PSA Rizal farmgate data (Jan 2016 - Jun 2026), see `training/` for the notebook and the full writeup of what was tried and why.

## How the pieces fit (read this first)

The Expo app **never calls this container**. Farmer create-listing writes a row with **no price**; Postgres trigger `croplisting_lock_price` copies `marketpricefeed.dry_base_price_per_kg` (plus variety premium) onto the listing.

To get a **model** price into that cache you must run, in order:

1. Local Supabase (Postgres + Auth)
2. This Docker container (FastAPI + `.keras` / `.pkl`)
3. Edge functions with `PRICING_SERVICE_URL` pointing at the container
4. One `sync-psa-prices` then `refresh-dry-base` (curl, not the app)
5. Expo pointed at **local** `127.0.0.1:54321`, not hosted Supabase

Opening the mobile app against `https://….supabase.co` will **not** use Docker on your laptop. Hosted cloud cannot reach `localhost:8000`.

**For testing and development of listings + model together, run everything locally** (this README). Hosted is the shared team DB; the model is only on hosted after FastAPI is deployed somewhere public and `PRICING_SERVICE_URL` is set there.

---

## Local testing and development (full stack)

Needs Docker and Node. Paths assume the repo is `~/Desktop/Animo`; change if yours differs.

Use **three terminals**. Leave (2) and (3) open.

### 1. Local database (Supabase)

```bash
cd ~/Desktop/Animo/mobile
npx supabase start
```

Wait until it prints URLs. This is a **copy** of the backend on your machine, not the hosted project.

First start applies migrations. Later starts just bring containers back.

**Wipe and replay all migrations** (destroys local data):

```bash
cd ~/Desktop/Animo/mobile
npx supabase db reset
```

If reset fails on duplicate `0009` / `0011` version numbers, you are on a stale branch — pull `feat/price-model` (pricing files are `0012`–`0016` after purchase-flow `0009`/`0010` and teammate `0011_receipt_idempotency_guard` when that file is in the repo).

Print keys in a form you can copy (the default `status` table often hides the anon JWT):

```bash
npx supabase status -o env
```

You need:

| Variable | Use |
|---|---|
| `API_URL` (`http://127.0.0.1:54321`) | Expo `EXPO_PUBLIC_SUPABASE_URL` |
| `ANON_KEY` (long `eyJ…` JWT) | Expo `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| `SERVICE_ROLE_KEY` (different `eyJ…`) | curl only — **never** in the app |

Ignore `PUBLISHABLE_KEY` / `SECRET_KEY` (`sb_publishable_…`) for this Expo client.

Studio: http://127.0.0.1:54323

### 2. Pricing container

Must join the Supabase Docker network so edge functions can call it by name `animo-pricing-service`.

```bash
cd ~/Desktop/Animo/pricing
docker build -t animo-pricing-service .
docker rm -f animo-pricing-service
docker run -d --name animo-pricing-service \
  --network supabase_network_mobile \
  -p 8000:8000 \
  animo-pricing-service
curl http://localhost:8000/health
```

Expect `{"status":"ok"}`. Rebuild only if `api/` or `models/` changed.

If you started the container **before** `supabase start`, the network will not exist. Start Supabase first, then:

```bash
docker network connect supabase_network_mobile animo-pricing-service
```

### 3. Edge functions (leave this terminal open)

```bash
echo 'PRICING_SERVICE_URL=http://animo-pricing-service:8000' > /tmp/edge_env.local
cd ~/Desktop/Animo/mobile
npx supabase functions serve --env-file /tmp/edge_env.local --no-verify-jwt
```

`--env-file` is how functions find FastAPI. `--no-verify-jwt` makes local curl easier; `sync-psa-prices` and `refresh-dry-base` still check the bearer inside the function.

Functions:

- http://127.0.0.1:54321/functions/v1/sync-psa-prices
- http://127.0.0.1:54321/functions/v1/refresh-dry-base
- http://127.0.0.1:54321/functions/v1/get-price-prediction
- http://127.0.0.1:54321/functions/v1/get-market-status

### 4. Seed history and write `dry_base` (required once)

Until this runs, new Dry listings lock at the migration **0007 seed (₱18.83)**. The app does **not** do this step.

```bash
cd ~/Desktop/Animo/mobile
# paste SERVICE_ROLE_KEY from: npx supabase status -o env
curl -X POST http://127.0.0.1:54321/functions/v1/sync-psa-prices \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{}'

curl -X POST http://127.0.0.1:54321/functions/v1/refresh-dry-base \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

`sync-psa-prices` needs network (PSA OpenSTAT). Then `refresh-dry-base` calls FastAPI and updates `marketpricefeed`.

Check Studio → `marketpricefeed` → `dry_base_price_per_kg` is no longer only ₱18.83.

### 5. Point the mobile app at **this** database

In `mobile/.env` (copy from `mobile/.env.example` if needed):

```env
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY from status -o env>
```

Restart Expo after changing `.env`. If this still has `https://….supabase.co`, you are on **hosted** and local Docker is unused.

**Physical phone (Expo Go):** `127.0.0.1` is the phone, not your PC. Use your computer’s LAN IP (`http://192.168.x.x:54321`) and the same `ANON_KEY`. Android emulator often needs `http://10.0.2.2:54321`. Simulator / Expo web can use `127.0.0.1`.

```bash
cd ~/Desktop/Animo/mobile
npx expo start
```

Local Auth is empty until you register (or use your own seed). Hosted `EXPO_PUBLIC_DEV_*` logins will **not** exist on local Postgres.

### 6. Smoke test

1. Register a farmer (and buyer) on **local**.
2. Create a **new Dry** listing.
3. Confirm `computed_price_per_kg` ≈ `dry_base` + variety premium in Studio.
4. Buyer Palengke → submit purchase request → farmer accept.

Wet listings use `wet_base` (survey default), not the LSTM.

### Stop

```bash
pkill -f "supabase functions serve"
docker rm -f animo-pricing-service
cd ~/Desktop/Animo/mobile
npx supabase stop
```

`supabase stop` does **not** wipe the local database. `db reset` does.

---

## FastAPI only (no database)

```bash
cd ~/Desktop/Animo/pricing
docker build -t animo-pricing-service .
docker run -p 8000:8000 animo-pricing-service
curl http://localhost:8000/health
```

This does **not** change listing prices. Listings only change after `refresh-dry-base` writes `marketpricefeed`.

---

## Contract for mobile / listings

This container is **not** the listing backend. Listings, auth, and schema live in `mobile/supabase`. FastAPI stays Supabase-unaware.

- **Tinantyang Presyo** on a listing is `marketpricefeed.dry_base_price_per_kg` (plus variety premium), locked at insert by `croplisting_lock_price`. Until the first successful `refresh-dry-base`, that column is the 0007 seed (₱18.83). Wet listings still use `wet_base_price_per_kg` (default ₱15.50).
- **Do not** call `get-price-prediction` at listing create. **Do not** send `estimated_price` or `computed_price_per_kg` from the client (the lock trigger skips if that column is already set).
- `refresh-dry-base` (service_role) writes `dry_base` after `sync-psa-prices` and when `nfa_intervention_window` changes. `nfa_intervention_window` is the model's 0/1 input only — v1 has no NFA buying-price labels on the feed.
- `get-market-status` is for the LGU dashboard, not the farmer/buyer app.
- `sync-psa-prices` is ops/cron (or an LGU "sync now" that pulls **PSA**, not NFA floors).

---

## Endpoints

### POST /predict-price

Called by `refresh-dry-base` (and `get-price-prediction` if you curl it). The cached nowcast on `marketpricefeed` is what listings show — not a live call from the app.

Request:
```json
{
  "last_prices": [11.18, 14.32, 16.43, 12.95, 13.28, 14.36, 20.25, 21.66, 24.31, 21.88, 19.17, 18.51],
  "target_month": 7,
  "target_date": "2026-07-01",
  "nfa_active": false
}
```
`last_prices` = the 12 most recent **confirmed** monthly prices, oldest first (mean_reversion needs the full trailing 12-month window). `target_month` is 1-12. `target_date` is the month being predicted. `nfa_active` is whether an NFA market intervention is active for `target_date` - this service no longer decides that itself (see below), the caller looks it up and passes the answer in.

Response:
```json
{
  "estimated_price": 20.46,
  "is_estimate": true,
  "label": "Tinantyang Presyo"
}
```

Always show this labeled as an estimate. Don't show the individual LSTM/GRU numbers separately, nobody needs that, we already checked which one matters.

### POST /market-status

Same input shape as above. This is for the LGU dashboard only, not the mobile app - it's a platform-wide "is the market weird right now" signal, not something tied to a specific listing.

Response:
```json
{
  "deviation_pct": 2.22,
  "threshold_pct": 9.36,
  "flagged": false,
  "status_label": "Normal"
}
```

### GET /health

Just returns `{"status": "ok"}`. Use it for whatever health check setup we end up with.

---

## Things that still need doing (not blocking, but don't forget)

- `last_prices` and `nfa_active` are supplied by the caller, not computed in here - this service is deliberately Supabase-unaware. `refresh-dry-base` / `get-price-prediction` / `get-market-status` pull the last 12 months from `palay_price_history` and the active window from `nfa_intervention_window`, then call this service. Don't add a Postgres/Supabase client to this service as a "fix" - that's an intentional boundary, not something missing.
- Model gets stale as new PSA data comes out monthly. No retraining job exists yet. `palay_price_history` through July 2026 is a live `sync-psa-prices` job once the stack is up — not a committed seed.
- `requirements.txt` pins `keras==3.13.2` (from the saved `.keras` metadata), `tensorflow>=2.16.1`, and `scikit-learn==1.6.1`. Don't bump sklearn without retraining and re-saving the models, or you'll get the sklearn version mismatch warning again (harmless-ish but don't tempt it).
- Hosted / teammates: they share the cloud DB. A local model run does not update hosted `dry_base`. To share a live nowcast without a public FastAPI host, run predict locally then **manually** update hosted `marketpricefeed` in Studio.

---

## Heads up on accuracy

Real talk: R² on the held-out test months is negative (best run got it to about -0.98). It still beats just assuming "this month = last month" though, and that's the more honest bar to judge it against given how little data exists for this specific province. Component 2 (the anomaly check) is what actually works well and consistently, it caught the worst months of the 2025 price crash reliably. Full breakdown of every approach we tried and why is in the research notes doc if you want the details before asking "wait is this good?"
