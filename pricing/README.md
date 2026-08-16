# pricing

LSTM/GRU price model + RF/SVR anomaly check for palay prices, wrapped as a FastAPI service. Trained on PSA Rizal farmgate data (Jan 2016 - Jun 2026), see `training/` for the notebook and the full writeup of what was tried and why.

## Running it

Needs Docker. The model container is only one piece — locally it talks to Supabase edge functions, which talk to local Postgres. Start in this order. Stop in reverse. Paths assume the repo lives at `~/Desktop/Animo`; adjust if yours is elsewhere.

### Start the full local stack

**1. Local Supabase** (Postgres, Auth, API on `54321`, Studio on `54323`):

```
cd ~/Desktop/Animo/mobile
npx supabase start
```

Wait until it prints URLs. This is a local copy of the backend, not the hosted project. First start applies migrations; later starts just bring the containers back. `npx supabase status` reprints the local URL and keys.

**2. This pricing container**, on the same Docker network as Supabase so edge functions can reach it by name (`animo-pricing-service`). Rebuild the image first only if `main.py` or the models changed:

```
cd ~/Desktop/Animo/pricing
docker build -t animo-pricing-service .
```

Then run it:

```
docker rm -f animo-pricing-service
docker run -d --name animo-pricing-service \
  --network supabase_network_mobile \
  -p 8000:8000 \
  animo-pricing-service
```

`--network supabase_network_mobile` is required. Without it, the functions cannot call `http://animo-pricing-service:8000`. If that network does not exist, step 1 was skipped. If the name is already in use, the `docker rm -f` line above clears it.

Check it's alive:

```
curl http://localhost:8000/health
```

**3. Edge functions** — leave this terminal open (it is the stand-in for Ctrl+C later). `--env-file` tells the functions where FastAPI lives. `--no-verify-jwt` skips Kong's JWT check so you can curl them locally; `sync-psa-prices` still checks the caller inside the function.

```
echo 'PRICING_SERVICE_URL=http://animo-pricing-service:8000' > /tmp/edge_env.local
cd ~/Desktop/Animo/mobile
npx supabase functions serve --env-file /tmp/edge_env.local --no-verify-jwt
```

`docker ps` should then show the `supabase_*` containers, `animo-pricing-service`, and `supabase_edge_runtime_mobile`. The functions are:

- http://127.0.0.1:54321/functions/v1/get-price-prediction
- http://127.0.0.1:54321/functions/v1/get-market-status
- http://127.0.0.1:54321/functions/v1/sync-psa-prices

Studio is at http://127.0.0.1:54323.

If you already started the pricing container without the Supabase network:

```
docker network connect supabase_network_mobile animo-pricing-service
```

### Stop the full local stack

You do not need the original terminals. From any new one:

```
pkill -f "supabase functions serve"
docker rm -f supabase_edge_runtime_mobile
docker rm -f animo-pricing-service
cd ~/Desktop/Animo/mobile
npx supabase stop
```

`pkill` is the stand-in for Ctrl+C if functions serve was started in another session. `npx supabase stop` shuts down all `supabase_*` containers but does **not** wipe the local database — the next `npx supabase start` comes back with the same data.

To replay every migration from scratch (destroys local data):

```
cd ~/Desktop/Animo/mobile
npx supabase db reset
```

After a reset, reconnect pricing to the network if that container is still running:

```
docker network connect supabase_network_mobile animo-pricing-service
```

### This container only (no Supabase)

If you just want to hit FastAPI directly and skip the edge functions:

```
docker build -t animo-pricing-service .
docker run -p 8000:8000 animo-pricing-service
```

## Endpoints

### POST /predict-price

The number the farmer/buyer app should show. This is the only endpoint the mobile app needs.

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

## Things that still need doing (not blocking, but don't forget)

- `last_prices` and `nfa_active` are supplied by the caller, not computed in here - this service is deliberately Supabase-unaware. The `get-price-prediction`/`get-market-status` Supabase edge functions are what actually pull the last 12 months from `palay_price_history` and the active window from `nfa_intervention_window`, then call this service. Don't add a Postgres/Supabase client to this service as a "fix" - that's an intentional boundary, not something missing.
- Model gets stale as new PSA data comes out monthly. No retraining job exists yet.
- `requirements.txt` has scikit-learn pinned to 1.6.1 on purpose, that's what the models were actually trained with. Don't bump it without retraining and re-saving the models, or you'll get the sklearn version mismatch warning again (harmless-ish but don't tempt it).

## Heads up on accuracy

Real talk: R² on the held-out test months is negative (best run got it to about -0.98). It still beats just assuming "this month = last month" though, and that's the more honest bar to judge it against given how little data exists for this specific province. Component 2 (the anomaly check) is what actually works well and consistently, it caught the worst months of the 2025 price crash reliably. Full breakdown of every approach we tried and why is in the research notes doc if you want the details before asking "wait is this good?"
