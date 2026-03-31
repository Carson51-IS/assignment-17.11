from datetime import datetime, timezone

import joblib
import pandas as pd

from config import MODEL_PATH, OP_DB_PATH
from utils_db import ensure_predictions_table, sqlite_conn


def run_inference() -> int:
    model = joblib.load(str(MODEL_PATH))

    with sqlite_conn(OP_DB_PATH) as conn:
        query = """
        SELECT
          o.order_id,
          o.num_items,
          o.total_value,
          o.avg_weight,
          o.order_timestamp,
          c.birthdate
        FROM orders o
        JOIN customers c ON o.customer_id = c.customer_id
        WHERE o.fulfilled = 0
        """
        df_live = pd.read_sql(query, conn)

    if df_live.empty:
        return 0

    df_live["order_timestamp"] = pd.to_datetime(df_live["order_timestamp"], errors="coerce")
    df_live["birthdate"] = pd.to_datetime(df_live["birthdate"], errors="coerce")

    now_year = datetime.now().year
    df_live["customer_age"] = now_year - df_live["birthdate"].dt.year

    df_live["order_dow"] = df_live["order_timestamp"].dt.dayofweek
    df_live["order_month"] = df_live["order_timestamp"].dt.month

    X_live = df_live[
        [
            "num_items",
            "total_value",
            "avg_weight",
            "customer_age",
            "order_dow",
            "order_month",
        ]
    ]

    probs = model.predict_proba(X_live)[:, 1]
    preds = model.predict(X_live)

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
            (order_id, late_delivery_probability, predicted_late_delivery, prediction_timestamp)
            VALUES (?, ?, ?, ?)
            """,
            out_rows,
        )
        conn.commit()

    return len(out_rows)


if __name__ == "__main__":
    n = run_inference()
    print(f"Inference complete. Predictions written: {n}")
