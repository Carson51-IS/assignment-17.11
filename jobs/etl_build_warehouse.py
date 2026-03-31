from datetime import datetime

import pandas as pd

from config import OP_DB_PATH, WH_DB_PATH
from utils_db import sqlite_conn


def build_modeling_table() -> int:
    with sqlite_conn(OP_DB_PATH) as conn:
        query = """
        SELECT
          o.order_id,
          o.customer_id,
          (
            SELECT COALESCE(SUM(oi.quantity), 0)
            FROM order_items oi WHERE oi.order_id = o.order_id
          ) AS num_items,
          o.order_subtotal AS total_value,
          (
            SELECT CASE WHEN COALESCE(SUM(oi.quantity), 0) > 0
              THEN SUM(oi.line_total) * 1.0 / SUM(oi.quantity)
              ELSE 0.0 END
            FROM order_items oi WHERE oi.order_id = o.order_id
          ) AS avg_line_price,
          o.order_datetime,
          sh.late_delivery AS label_late_delivery,
          c.gender,
          c.birthdate
        FROM orders o
        JOIN customers c ON o.customer_id = c.customer_id
        JOIN shipments sh ON sh.order_id = o.order_id
        """
        df = pd.read_sql(query, conn)

    df["order_datetime"] = pd.to_datetime(df["order_datetime"], errors="coerce")
    df["birthdate"] = pd.to_datetime(df["birthdate"], errors="coerce")

    now_year = datetime.now().year
    df["customer_age"] = now_year - df["birthdate"].dt.year

    df["order_dow"] = df["order_datetime"].dt.dayofweek
    df["order_month"] = df["order_datetime"].dt.month

    df["gender"] = df["gender"].fillna("unknown").astype(str)

    modeling_cols = [
        "order_id",
        "customer_id",
        "num_items",
        "total_value",
        "avg_line_price",
        "customer_age",
        "order_dow",
        "order_month",
        "gender",
        "label_late_delivery",
    ]

    df_model = df[modeling_cols].dropna(subset=["label_late_delivery"])

    WH_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with sqlite_conn(WH_DB_PATH) as wh_conn:
        df_model.to_sql("modeling_orders", wh_conn, if_exists="replace", index=False)

    return len(df_model)


if __name__ == "__main__":
    n = build_modeling_table()
    print(f"Warehouse updated. modeling_orders rows: {n}")
