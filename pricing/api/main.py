import json
import numpy as np
import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field
from tensorflow.keras.models import load_model

app = FastAPI(title="ANIMO Pricing Service")

MODELS_DIR = "../models"
N_SEEDS = 10  # size of the LSTM/GRU committee - averaging across many training

lstm_models = [load_model(f"{MODELS_DIR}/lstm_model_{i}.keras") for i in range(N_SEEDS)]
gru_models = [load_model(f"{MODELS_DIR}/gru_model_{i}.keras") for i in range(N_SEEDS)]
rf_model = joblib.load(f"{MODELS_DIR}/rf_model.pkl")
svr_model = joblib.load(f"{MODELS_DIR}/svr_model.pkl")
price_scaler = joblib.load(f"{MODELS_DIR}/price_scaler.pkl")
svr_input_scaler = joblib.load(f"{MODELS_DIR}/svr_input_scaler.pkl")
svr_output_scaler = joblib.load(f"{MODELS_DIR}/svr_output_scaler.pkl")

with open(f"{MODELS_DIR}/anomaly_config.json") as f:
    anomaly_config = json.load(f)

LOOKBACK = anomaly_config["lookback"]
ANOMALY_THRESHOLD = anomaly_config["threshold_pct"]

# validated 40/60 blend, not 50/50 - see research notes section U.3
LSTM_WEIGHT = 0.4
GRU_WEIGHT = 0.6


class PriceRequest(BaseModel):
    # needs 12 months now, not 7 - mean_reversion needs a full trailing
    # 12-month window to calculate correctly, and that same window already
    # covers everything momentum and the LSTM/GRU lookback need too
    last_prices: list[float] = Field(..., min_length=12, max_length=12,
                                      description="The 12 most recent confirmed monthly prices, oldest first")
    target_month: int = Field(..., ge=1, le=12)
    target_date: str
    # Whether an NFA market intervention is active for target_date. Used to
    # be computed here from a hardcoded date-range list - that list has moved
    # to the nfa_intervention_window Supabase table, and it's now the
    # caller's job (the get-price-prediction/get-market-status edge
    # functions) to look it up and pass the answer in directly. This service
    # stays Supabase-unaware on purpose.
    nfa_active: bool


def build_inputs(req: PriceRequest):
    all_prices = np.array(req.last_prices)  # 12 values, oldest first
    window_prices = all_prices[-LOOKBACK:]  # last 6, what the LSTM/GRU sees

    # momentum: 3-month rate of change ending at the most recent known month
    momentum = (all_prices[-1] - all_prices[-4]) / all_prices[-4]

    # mean-reversion: how far the most recent known price sits from the
    # trailing 12-month average - same math as the notebook's rolling(12).mean()
    ma_12mo = np.mean(all_prices)
    mean_reversion = (all_prices[-1] - ma_12mo) / ma_12mo

    month_sin = np.sin(2 * np.pi * req.target_month / 12)
    month_cos = np.cos(2 * np.pi * req.target_month / 12)

    window_df = pd.DataFrame(window_prices.reshape(-1, 1), columns=["price"])
    window_scaled = price_scaler.transform(window_df).reshape(1, LOOKBACK, 1)
    feat = np.array([[month_sin, month_cos, int(req.nfa_active), momentum, mean_reversion]])
    return window_prices, window_scaled, feat


def ensemble_predict(window_scaled, feat):
    lstm_p = np.mean([
        price_scaler.inverse_transform(m.predict([window_scaled, feat], verbose=0))[0, 0]
        for m in lstm_models
    ])
    gru_p = np.mean([
        price_scaler.inverse_transform(m.predict([window_scaled, feat], verbose=0))[0, 0]
        for m in gru_models
    ])
    return LSTM_WEIGHT * lstm_p + GRU_WEIGHT * gru_p


@app.post("/predict-price")
def predict_price(req: PriceRequest):
    window_prices, window_scaled, feat = build_inputs(req)
    ensemble_p = ensemble_predict(window_scaled, feat)

    return {
        "estimated_price": round(float(ensemble_p), 2),
        "is_estimate": True,
        "label": "Tinantyang Presyo",
    }


@app.post("/market-status")
def market_status(req: PriceRequest):
    window_prices, window_scaled, feat = build_inputs(req)
    ensemble_p = ensemble_predict(window_scaled, feat)

    # RF/SVR stay blind to season/NFA/momentum/mean_reversion on purpose -
    # raw price only - otherwise they'd just agree with Component 1 all the
    # time and the whole disagreement check would be pointless
    tab_x = window_prices.reshape(1, -1)
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
