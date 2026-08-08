import json
import numpy as np
import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field
from tensorflow.keras.models import load_model

app = FastAPI(title="ANIMO Pricing Service")

# load once at startup, not on every request - reloading these every call would be slow
MODELS_DIR = "../models"

lstm_model = load_model(f"{MODELS_DIR}/lstm_model.keras")
gru_model = load_model(f"{MODELS_DIR}/gru_model.keras")
rf_model = joblib.load(f"{MODELS_DIR}/rf_model.pkl")
svr_model = joblib.load(f"{MODELS_DIR}/svr_model.pkl")
price_scaler = joblib.load(f"{MODELS_DIR}/price_scaler.pkl")
svr_input_scaler = joblib.load(f"{MODELS_DIR}/svr_input_scaler.pkl")
svr_output_scaler = joblib.load(f"{MODELS_DIR}/svr_output_scaler.pkl")

with open(f"{MODELS_DIR}/anomaly_config.json") as f:
    anomaly_config = json.load(f)

LOOKBACK = anomaly_config["lookback"]
ANOMALY_THRESHOLD = anomaly_config["threshold_pct"]

# NFA windows we know about right now. This needs to move to an admin-editable
# setting later (same as the floor price update flow) - hardcoding it here is
# just to get things working for now, not the real long-term plan.
NFA_WINDOWS = [
    ("2019-01-01", "2020-12-01"),
    ("2025-01-01", "2026-06-01"),
]


class PriceRequest(BaseModel):
    last_prices: list[float] = Field(..., min_length=6, max_length=6)
    target_month: int = Field(..., ge=1, le=12)
    target_date: str  # e.g. "2026-07-01", used to check if NFA is active


def is_nfa_active(date_str: str) -> int:
    d = pd.Timestamp(date_str)
    for start, end in NFA_WINDOWS:
        if pd.Timestamp(start) <= d <= pd.Timestamp(end):
            return 1
    return 0


@app.post("/predict-price")
def predict_price(req: PriceRequest):
    # this is the only number the mobile app should show - farmers/buyers
    # never need to see the individual LSTM/GRU numbers, just the average
    prices = np.array(req.last_prices)
    month_sin = np.sin(2 * np.pi * req.target_month / 12)
    month_cos = np.cos(2 * np.pi * req.target_month / 12)
    nfa_active = is_nfa_active(req.target_date)

    window_df = pd.DataFrame(prices.reshape(-1, 1), columns=["price"])
    window_scaled = price_scaler.transform(window_df).reshape(1, LOOKBACK, 1)
    feat = np.array([[month_sin, month_cos, nfa_active]])

    lstm_p = price_scaler.inverse_transform(lstm_model.predict([window_scaled, feat], verbose=0))[0, 0]
    gru_p = price_scaler.inverse_transform(gru_model.predict([window_scaled, feat], verbose=0))[0, 0]
    ensemble_p = (lstm_p + gru_p) / 2

    return {
        "estimated_price": round(float(ensemble_p), 2),
        "is_estimate": True,
        "label": "Tinantyang Presyo",
    }


@app.post("/market-status")
def market_status(req: PriceRequest):
    # for the LGU dashboard only - this is a platform-wide signal, not tied
    # to any one listing, so the mobile app has no reason to call this
    prices = np.array(req.last_prices)
    month_sin = np.sin(2 * np.pi * req.target_month / 12)
    month_cos = np.cos(2 * np.pi * req.target_month / 12)
    nfa_active = is_nfa_active(req.target_date)

    window_df = pd.DataFrame(prices.reshape(-1, 1), columns=["price"])
    window_scaled = price_scaler.transform(window_df).reshape(1, LOOKBACK, 1)
    feat = np.array([[month_sin, month_cos, nfa_active]])

    lstm_p = price_scaler.inverse_transform(lstm_model.predict([window_scaled, feat], verbose=0))[0, 0]
    gru_p = price_scaler.inverse_transform(gru_model.predict([window_scaled, feat], verbose=0))[0, 0]
    ensemble_p = (lstm_p + gru_p) / 2

    # RF/SVR stay blind to season/NFA on purpose - raw price only - otherwise
    # they'd just agree with Component 1 all the time and the whole check is pointless
    tab_x = prices.reshape(1, -1)
    rf_p = rf_model.predict(tab_x)[0]
    svr_p = svr_output_scaler.inverse_transform(
        svr_model.predict(svr_input_scaler.transform(tab_x)).reshape(-1, 1)
    )[0, 0]
    anomaly_p = (rf_p + svr_p) / 2

    deviation_pct = abs(ensemble_p - anomaly_p) / anomaly_p * 100
    flagged = deviation_pct > ANOMALY_THRESHOLD

    return {
        "deviation_pct": round(float(deviation_pct), 2),
        "threshold_pct": round(ANOMALY_THRESHOLD, 2),
        "flagged": bool(flagged),
        "status_label": "Elevated volatility detected" if flagged else "Normal",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
