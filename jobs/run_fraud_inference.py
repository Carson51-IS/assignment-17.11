"""
Score unfulfilled (no shipment) orders with the sklearn pipeline exported from the fraud notebook.

Requires artifacts/fraud_artifacts.joblib containing at minimum:
  {"pipeline": fitted_sklearn_pipeline}

Optional:
  {"threshold": float}  — used for predicted_fraud; default 0.5

Writes rows to order_predictions (SQLite shop.db or Supabase when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set).
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd

from config import ARTIFACTS_DIR, FRAUD_ARTIFACTS_PATH, OP_DB_PATH
from fraud_data import (
    TARGET_COL,
    engineer_features,
    load_orders_merged_sqlite,
    load_orders_merged_supabase,
    unfulfilled_order_ids_sqlite,
    unfulfilled_order_ids_supabase,
)
from assignment_env import supabase_url_and_key
from utils_db import ensure_predictions_table, sqlite_conn


def _load_artifacts():
    path = Path(os.environ.get("FRAUD_ARTIFACTS_PATH", str(FRAUD_ARTIFACTS_PATH)))
    if not path.exists():
        raise FileNotFoundError(
            f"Missing {path}. Train in IS_Fraud_Notebook.ipynb, then save:\n"
            '  import joblib; joblib.dump({"pipeline": best_pipe, "threshold": float(thresh)}, r"'
            + str(path.as_posix())
            + '")'
        )
    blob = joblib.load(str(path))
    if not isinstance(blob, dict) or "pipeline" not in blob:
        raise ValueError("fraud_artifacts.joblib must be a dict with a 'pipeline' key.")
    return blob


def _score_sqlite() -> int:
    blob = _load_artifacts()
    pipeline = blob["pipeline"]
    thresh = float(blob.get("threshold", 0.5))

    with sqlite_conn(OP_DB_PATH) as conn:
        df_raw = load_orders_merged_sqlite(conn)
        shipped = unfulfilled_order_ids_sqlite(conn)

    if df_raw.empty:
        return 0

    df_raw = df_raw[df_raw[TARGET_COL].notna()].copy() if TARGET_COL in df_raw.columns else df_raw

    df_fe, _ = engineer_features(df_raw)
    mask_live = ~df_fe["order_id"].isin(shipped)
    df_live = df_fe.loc[mask_live].copy()
    if df_live.empty:
        return 0

    X = df_live.drop(columns=[TARGET_COL], errors="ignore")
    probs = pipeline.predict_proba(X)[:, 1]
    preds = (probs >= thresh).astype(int)

    ts = datetime.now(timezone.utc).isoformat()
    out_rows = [
        (int(oid), float(p), int(yhat), ts)
        for oid, p, yhat in zip(df_live["order_id"], probs, preds)
    ]

    with sqlite_conn(OP_DB_PATH) as conn:
        ensure_predictions_table(conn)
        cur = conn.cursor()
        cur.executemany(
            """
            INSERT OR REPLACE INTO order_predictions
            (order_id, fraud_probability, predicted_fraud, prediction_timestamp)
            VALUES (?, ?, ?, ?)
            """,
            out_rows,
        )
        conn.commit()

    return len(out_rows)


def _score_supabase() -> int:
    from supabase import create_client

    url, key = supabase_url_and_key()
    client = create_client(url, key)

    blob = _load_artifacts()
    pipeline = blob["pipeline"]
    thresh = float(blob.get("threshold", 0.5))

    df_raw = load_orders_merged_supabase(client)
    shipped = unfulfilled_order_ids_supabase(client)

    if df_raw.empty:
        return 0

    if TARGET_COL in df_raw.columns:
        df_raw = df_raw[df_raw[TARGET_COL].notna()].copy()

    df_fe, _ = engineer_features(df_raw)
    mask_live = ~df_fe["order_id"].isin(shipped)
    df_live = df_fe.loc[mask_live].copy()
    if df_live.empty:
        return 0

    X = df_live.drop(columns=[TARGET_COL], errors="ignore")
    probs = pipeline.predict_proba(X)[:, 1]
    preds = (probs >= thresh).astype(int)

    ts = datetime.now(timezone.utc).isoformat()
    rows = [
        {
            "order_id": int(oid),
            "fraud_probability": float(p),
            "predicted_fraud": int(yhat),
            "prediction_timestamp": ts,
        }
        for oid, p, yhat in zip(df_live["order_id"], probs, preds)
    ]

    batch = 400
    for i in range(0, len(rows), batch):
        client.table("order_predictions").upsert(rows[i : i + batch]).execute()
    return len(rows)


def run_fraud_inference() -> int:
    url, key = supabase_url_and_key()
    if url and key:
        return _score_supabase()
    return _score_sqlite()


if __name__ == "__main__":
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    n = run_fraud_inference()
    print(f"Inference complete. Predictions written: {n}")
