"""
One-time copy of course shop.db into a remote Supabase Postgres database.

Usage (from assignment root, after pip install -r requirements.txt):
  Fill assignment root ".env" (see .env.example), then:
  python jobs/import_sqlite_to_supabase.py

Requires the SQL migration to have been applied (supabase/migrations/...).
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

from supabase import create_client

from assignment_env import supabase_url_and_key


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    db_path = root / "shop.db"
    if not db_path.exists():
        raise SystemExit(f"Missing {db_path}")

    url, key = supabase_url_and_key()
    if not url or not key:
        raise SystemExit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")

    sb = create_client(url, key)
    sq = sqlite3.connect(db_path)
    sq.row_factory = sqlite3.Row

    def tb(table: str) -> list[dict]:
        cur = sq.execute(f"SELECT * FROM {table}")
        rows = [dict(r) for r in cur.fetchall()]
        for d in rows:
            for k, v in list(d.items()):
                if k in {"is_active", "promo_used", "is_fraud", "late_delivery"} and v is not None:
                    d[k] = bool(v)
        return rows

    def upsert_chunks(table: str, rows: list[dict], size: int = 400) -> None:
        for i in range(0, len(rows), size):
            chunk = rows[i : i + size]
            sb.table(table).upsert(chunk).execute()

    # FK order
    order = ["customers", "products", "orders", "order_items", "shipments", "product_reviews"]
    for table in order:
        rows = tb(table)
        if not rows:
            print(f"skip empty {table}")
            continue
        upsert_chunks(table, rows)
        print(f"upsert {table}: {len(rows)} rows")

    sq.close()
    print("Done. Reset sequences from SQL editor if ids ever collide:")
    print(
        "  select setval(pg_get_serial_sequence('customers','customer_id'), "
        "(select max(customer_id) from customers));"
    )


if __name__ == "__main__":
    main()
