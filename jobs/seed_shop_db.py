"""
Create data/shop.db with schema aligned to IS 455 Ch. 17 jobs + web app.
Run once if absent; course may replace data/shop.db with an instructor file.
"""
from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta
import random

from config import DATA_DIR, OP_DB_PATH


def create_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        DROP TABLE IF EXISTS order_items;
        DROP TABLE IF EXISTS order_predictions;
        DROP TABLE IF EXISTS orders;
        DROP TABLE IF EXISTS products;
        DROP TABLE IF EXISTS customers;

        CREATE TABLE customers (
          customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT NOT NULL,
          gender TEXT,
          birthdate TEXT NOT NULL
        );

        CREATE TABLE products (
          product_id INTEGER PRIMARY KEY AUTOINCREMENT,
          product_name TEXT NOT NULL,
          price REAL NOT NULL,
          weight REAL NOT NULL DEFAULT 1.0
        );

        CREATE TABLE orders (
          order_id INTEGER PRIMARY KEY AUTOINCREMENT,
          customer_id INTEGER NOT NULL,
          order_timestamp TEXT NOT NULL,
          fulfilled INTEGER NOT NULL DEFAULT 0,
          total_value REAL NOT NULL DEFAULT 0,
          num_items INTEGER NOT NULL DEFAULT 0,
          avg_weight REAL NOT NULL DEFAULT 0,
          late_delivery INTEGER,
          is_fraud INTEGER DEFAULT 0,
          FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
        );

        CREATE TABLE order_items (
          order_item_id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(order_id),
          FOREIGN KEY (product_id) REFERENCES products(product_id)
        );

        CREATE TABLE order_predictions (
          order_id INTEGER PRIMARY KEY,
          late_delivery_probability REAL,
          predicted_late_delivery INTEGER,
          prediction_timestamp TEXT,
          FOREIGN KEY (order_id) REFERENCES orders(order_id)
        );
        """
    )
    conn.commit()


def seed() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    random.seed(42)
    base = datetime(2025, 1, 15, 10, 0, 0)

    with sqlite3.connect(str(OP_DB_PATH)) as conn:
        create_schema(conn)
        cur = conn.cursor()

        customers_rows = [
            ("Alice", "Nguyen", "alice@example.com", "F", "1988-03-12"),
            ("Bob", "Martinez", "bob@example.com", "M", "1992-07-22"),
            ("Carol", "Patel", "carol@example.com", "F", "1985-11-05"),
            ("Diego", "Kim", "diego@example.com", "M", "1999-01-30"),
            ("Elena", "Brown", "elena@example.com", "F", "1994-09-18"),
        ]
        cur.executemany(
            "INSERT INTO customers (first_name, last_name, email, gender, birthdate) VALUES (?,?,?,?,?)",
            customers_rows,
        )

        products_rows = [
            ("Desk Lamp", 29.99, 2.5),
            ("Notebook Set", 14.50, 0.8),
            ("Steel Mug", 19.00, 0.5),
            ("Monitor Stand", 89.99, 5.2),
            ("USB Cable", 9.25, 0.1),
        ]
        cur.executemany(
            "INSERT INTO products (product_name, price, weight) VALUES (?,?,?)",
            products_rows,
        )
        conn.commit()

        cur.execute("SELECT customer_id FROM customers")
        customer_ids = [r[0] for r in cur.fetchall()]
        cur.execute("SELECT product_id, price, weight FROM products")
        prod_meta = cur.fetchall()

        # Historical fulfilled orders with labels for training
        for i in range(80):
            cid = random.choice(customer_ids)
            ts = base + timedelta(days=i // 3, hours=random.randint(0, 8))
            n_lines = random.randint(1, 4)
            lines = []
            total = 0.0
            wsum = 0.0
            n_items = 0
            for _ in range(n_lines):
                pid, price, weight = random.choice(prod_meta)
                qty = random.randint(1, 3)
                lines.append((pid, qty, price))
                total += price * qty
                wsum += weight * qty
                n_items += qty

            avg_w = wsum / n_items if n_items else 0
            late = 1 if (n_items > 5 or total > 120 or random.random() < 0.28) else 0

            cur.execute(
                """
                INSERT INTO orders (customer_id, order_timestamp, fulfilled, total_value, num_items, avg_weight, late_delivery, is_fraud)
                VALUES (?,?,1,?,?,?,?,0)
                """,
                (cid, ts.isoformat(), round(total, 2), n_items, round(avg_w, 4), late),
            )
            oid = cur.lastrowid
            for pid, qty, price in lines:
                cur.execute(
                    """
                    INSERT INTO order_items (order_id, product_id, quantity, unit_price)
                    VALUES (?,?,?,?)
                    """,
                    (oid, pid, qty, price),
                )

        # A few unfulfilled orders for priority queue / inference
        for j in range(12):
            cid = random.choice(customer_ids)
            ts = base + timedelta(days=50, hours=j * 2)
            pid, price, weight = random.choice(prod_meta)
            qty = random.randint(1, 4)
            total = price * qty
            avg_w = weight

            cur.execute(
                """
                INSERT INTO orders (customer_id, order_timestamp, fulfilled, total_value, num_items, avg_weight, late_delivery, is_fraud)
                VALUES (?,?,0,?,?,?,NULL,0)
                """,
                (cid, ts.isoformat(), round(total, 2), qty, round(avg_w, 4)),
            )
            oid = cur.lastrowid
            cur.execute(
                """
                INSERT INTO order_items (order_id, product_id, quantity, unit_price)
                VALUES (?,?,?,?)
                """,
                (oid, pid, qty, price),
            )

        conn.commit()
        print(f"Seeded {OP_DB_PATH}")


if __name__ == "__main__":
    seed()
