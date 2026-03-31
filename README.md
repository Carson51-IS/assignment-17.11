# IS 455 Assignment 17.11 — Part 1 (Web app + deployment)

This folder implements Chapter 17 (Sections 17.1–17.9): operational SQLite database (`data/shop.db`), Python jobs for ETL / training / late-delivery inference, and a **Next.js** app under `web/` for the warehouse priority queue and customer workflows.

## Prerequisites

- **Python 3** with `pip`
- **Node.js 20+** and npm

## One-time setup (assignment root)

Install Python dependencies:

```powershell
pip install -r requirements.txt
```

Create the SQLite database (development seed). **Warning:** `jobs/seed_shop_db.py` drops and recreates tables — skip this if you are placing the instructor-provided `shop.db` at `data/shop.db` instead.

```powershell
python jobs/seed_shop_db.py
```

Build the analytical warehouse, train the model, and write predictions for unfulfilled orders:

```powershell
python jobs/etl_build_warehouse.py
python jobs/train_model.py
python jobs/run_inference.py
```

Install and run the web app (from `web/`):

```powershell
cd web
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Debug schema** to confirm tables match your `shop.db` (especially if you replaced the seed file).

## App routes

| Route | Purpose |
|-------|---------|
| `/select-customer` | Pick a customer; `customer_id` stored in an HTTP-only cookie |
| `/dashboard` | Order count, spend, recent orders |
| `/place-order` | New order + line items (transactional insert) |
| `/orders` | Order history; `/orders/[order_id]` line-item detail |
| `/warehouse/priority` | Top 50 unfulfilled orders by `late_delivery_probability` |
| `/scoring` | **Run Scoring** — runs `python jobs/run_inference.py` (set `PYTHON_EXE` if needed) |
| `/debug/schema` | `PRAGMA table_info` for every table |

## Deployment (Vercel vs equivalent)

- **Full textbook behavior** (SQLite file on disk, `better-sqlite3`, subprocess Python scoring) matches **[Railway](https://railway.app), [Render](https://render.com), or [Fly.io](https://fly.io)** with a single Node + Python image or two services on persistent storage.
- **Vercel serverless** does not reliably support writable on-disk SQLite, native `better-sqlite3`, or an included sklearn/Python venv for `run_inference.py`. To use Vercel, plan on a hosted database (for example Turso/libSQL or Postgres) and run scoring as a separate scheduled Python job or microservice that updates prediction tables.

Document whichever path you choose when you submit your live URL.

## Manual QA (Chapter 17.9)

1. **Select customer** — cookie banner updates; dashboard loads.
2. **Place order** — row appears on `/orders`; totals match line items.
3. **Run scoring** — success output shows “Predictions written: …”; no Python tracebacks.
4. **Priority queue** — new unfulfilled order appears after scoring (joins `order_predictions`); sort is highest probability first.

## Project layout

```text
assignment 17.11/
  data/                 # shop.db, warehouse.db (generated)
  artifacts/            # late_delivery_model.sav, metrics JSON (generated)
  jobs/                 # seed, ETL, train, inference
  web/                  # Next.js App Router UI
```
