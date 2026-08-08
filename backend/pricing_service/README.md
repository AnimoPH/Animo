# pricing_service

LSTM/GRU price model + RF/SVR anomaly check for palay prices, wrapped as a FastAPI service. Trained on PSA Rizal farmgate data (Jan 2016 - Jun 2026), see `training/` for the notebook and the full writeup of what was tried and why.

## Running it

Needs Docker. From this folder:

```
docker build -t animo-pricing-service .
docker run -p 8000:8000 animo-pricing-service
```

Check it's alive:

```
curl http://localhost:8000/health
```

## Endpoints

### POST /predict-price

The number the farmer/buyer app should show. This is the only endpoint the mobile app needs.

Request:
```json
{
  "last_prices": [20.25, 21.66, 24.31, 21.88, 19.17, 18.51],
  "target_month": 7,
  "target_date": "2026-07-01"
}
```
`last_prices` = the 6 most recent **confirmed** monthly prices, oldest first. `target_month` is 1-12. `target_date` is just used to check if an NFA intervention window is active.

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

- `last_prices` is currently something you have to pass in yourself. It should be pulled from Postgres automatically once we have the price history table set up.
- The NFA intervention dates are hardcoded in `main.py` right now (`NFA_WINDOWS`). This needs to become something an LGU admin can actually update, same idea as how the floor price gets updated. Don't add more dates to that list as a "fix", it's a placeholder.
- Model gets stale as new PSA data comes out monthly. No retraining job exists yet.
- `requirements.txt` has scikit-learn pinned to 1.6.1 on purpose, that's what the models were actually trained with. Don't bump it without retraining and re-saving the models, or you'll get the sklearn version mismatch warning again (harmless-ish but don't tempt it).

## Heads up on accuracy

Real talk: R² on the held-out test months is negative (best run got it to about -0.98). It still beats just assuming "this month = last month" though, and that's the more honest bar to judge it against given how little data exists for this specific province. Component 2 (the anomaly check) is what actually works well and consistently, it caught the worst months of the 2025 price crash reliably. Full breakdown of every approach we tried and why is in the research notes doc if you want the details before asking "wait is this good?"
