import sqlite3
from contextlib import contextmanager
from pathlib import Path


@contextmanager
def sqlite_conn(db_path: Path):
    conn = sqlite3.connect(str(db_path))
    try:
        yield conn
    finally:
        conn.close()


def ensure_predictions_table(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='order_predictions'")
    if cur.fetchone():
        cur.execute("PRAGMA table_info(order_predictions)")
        cols = {r[1] for r in cur.fetchall()}
        if "fraud_probability" not in cols:
            cur.execute("DROP TABLE order_predictions")
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS order_predictions (
          order_id INTEGER PRIMARY KEY,
          fraud_probability REAL NOT NULL,
          predicted_fraud INTEGER NOT NULL,
          prediction_timestamp TEXT NOT NULL
        )
        """
    )
    conn.commit()
