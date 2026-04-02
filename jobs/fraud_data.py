"""
Feature construction aligned with IS_Fraud_Notebook.ipynb (data prep + engineer_features).
Used by run_fraud_inference for batch scoring against SQLite or Supabase.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

TARGET_COL = "is_fraud"


def pick_first(existing: set[str], candidates: list[str]) -> str | None:
    for c in candidates:
        if c in existing:
            return c
    return None


def parse_datetime_columns(df_in: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    df_out = df_in.copy()
    dt_cols: list[str] = []

    candidates = [
        c
        for c in df_out.columns
        if any(t in c.lower() for t in ["date", "time", "created", "timestamp"])
    ]

    for c in candidates:
        if pd.api.types.is_datetime64_any_dtype(df_out[c]):
            dt_cols.append(c)
            continue

        parsed = pd.to_datetime(df_out[c], errors="coerce", utc=True)
        if parsed.notna().mean() >= 0.6 and parsed.nunique(dropna=True) >= 10:
            df_out[c] = parsed
            dt_cols.append(c)

    return df_out, dt_cols


def add_datetime_features(df_in: pd.DataFrame, dt_cols: list[str]) -> pd.DataFrame:
    df_out = df_in.copy()
    for c in dt_cols:
        s = df_out[c]
        if not pd.api.types.is_datetime64_any_dtype(s):
            continue
        base = c.lower()
        df_out[f"{base}__hour"] = s.dt.hour
        df_out[f"{base}__dayofweek"] = s.dt.dayofweek
        df_out[f"{base}__month"] = s.dt.month
    return df_out


def engineer_features(df_in: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    df1, dt_cols = parse_datetime_columns(df_in)
    df2 = add_datetime_features(df1, dt_cols)

    for amt_col in ["amount", "total", "total_amount", "order_total", "payment_amount"]:
        if amt_col in df2.columns and pd.api.types.is_numeric_dtype(df2[amt_col]):
            df2[f"{amt_col}__log1p"] = np.log1p(df2[amt_col].clip(lower=0))

    return df2, dt_cols


def _fetch_all_rows(table_query):
    """Paginate through Supabase to get all rows (default limit is 1000)."""
    all_rows: list[dict] = []
    page_size = 1000
    offset = 0
    while True:
        resp = table_query.range(offset, offset + page_size - 1).execute()
        batch = resp.data or []
        all_rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return all_rows


def load_orders_merged_sqlite(conn) -> pd.DataFrame:
    df = pd.read_sql_query("SELECT * FROM orders", conn)
    cust = pd.read_sql_query("SELECT * FROM customers", conn)
    cust = cust.add_prefix("customer__")
    return df.merge(
        cust,
        left_on="customer_id",
        right_on="customer__customer_id",
        how="left",
    )


def load_orders_merged_supabase(supabase) -> pd.DataFrame:
    o_rows = _fetch_all_rows(supabase.table("orders").select("*"))
    c_rows = _fetch_all_rows(supabase.table("customers").select("*"))
    df = pd.DataFrame(o_rows)
    cust = pd.DataFrame(c_rows).add_prefix("customer__")
    if df.empty:
        return df
    return df.merge(
        cust,
        left_on="customer_id",
        right_on="customer__customer_id",
        how="left",
    )


def unfulfilled_order_ids_sqlite(conn) -> set[int]:
    cur = conn.cursor()
    cur.execute("SELECT order_id FROM shipments")
    return {int(r[0]) for r in cur.fetchall()}


def unfulfilled_order_ids_supabase(supabase) -> set[int]:
    rows = _fetch_all_rows(supabase.table("shipments").select("order_id"))
    return {int(x["order_id"]) for x in rows}
