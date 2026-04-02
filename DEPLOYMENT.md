# Supabase + Vercel deployment

The Next.js app in `web/` can use **local `shop.db`** (default) or **Supabase Postgres** when you set environment variables. Batch fraud scoring runs in **Python** (GitHub Actions on a schedule). Vercel only serves the UI and queues jobs; it does not execute scikit-learn.

## 1. Export the model from the notebook

After training in `IS_Fraud_Notebook.ipynb`, run the new cells at the bottom (or):

```python
from pathlib import Path
import joblib
ART = Path("artifacts/fraud_artifacts.joblib")
ART.parent.mkdir(parents=True, exist_ok=True)
joblib.dump({"pipeline": best_pipe, "threshold": float(thresh)}, ART)
```

Commit **`artifacts/fraud_artifacts.joblib`** so GitHub Actions can load it, or attach it as a release artifact and download it in the workflow (not configured here).

## 2. Supabase CLI — your steps

1. Install: [Supabase CLI](https://supabase.com/docs/guides/cli) (e.g. `npm i -g supabase` or `scoop install supabase`).
2. Log in: `supabase login`.
3. Create a project in the [Supabase dashboard](https://supabase.com/dashboard) (if you do not have one).
4. Link this repo folder: from the **assignment root** run:
   - `supabase link --project-ref <your-project-ref>`
5. Push the schema:
   - `supabase db push`  
   (applies `supabase/migrations/20260402120000_shop_schema.sql`.)
6. In the dashboard: **Project Settings → API** — copy **Project URL** and **service_role** key (server-only; never expose in the browser).

## 3. Load `shop.db` into Supabase (one-time)

From the assignment root (with Python deps installed):

```powershell
$env:SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
python jobs/import_sqlite_to_supabase.py
```

Then in the Supabase SQL editor, reset identity sequences so new inserts get fresh IDs (run for each table that you imported with explicit IDs):

```sql
select setval(pg_get_serial_sequence('customers','customer_id'), coalesce((select max(customer_id) from customers), 1));
select setval(pg_get_serial_sequence('products','product_id'), coalesce((select max(product_id) from products), 1));
select setval(pg_get_serial_sequence('orders','order_id'), coalesce((select max(order_id) from orders), 1));
select setval(pg_get_serial_sequence('order_items','order_item_id'), coalesce((select max(order_item_id) from order_items), 1));
select setval(pg_get_serial_sequence('shipments','shipment_id'), coalesce((select max(shipment_id) from shipments), 1));
select setval(pg_get_serial_sequence('product_reviews','review_id'), coalesce((select max(review_id) from product_reviews), 1));
```

## 4. GitHub Actions — repository secrets

In **GitHub → Settings → Secrets and variables → Actions**, add:

| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Same as dashboard Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (used only in Actions) |

The workflow `.github/workflows/fraud-scoring.yml` runs `python jobs/run_fraud_inference.py` on a schedule and after manual **Run workflow**.

### Optional: “Run Scoring” / Vercel cron → same workflow

Create a fine-grained or classic PAT with **`actions:write`** on this repo. Add:

| `GITHUB_TRIGGER_TOKEN` | PAT |
| `GITHUB_REPO` | `your-github-username/your-repo-name` |

Optional: `GITHUB_WORKFLOW_FILE` (default `fraud-scoring.yml`), `GITHUB_BRANCH` (default `main`).

## 5. Vercel CLI — your steps

1. Install: `npm i -g vercel`
2. Log in: `vercel login`
3. From the **`web/`** directory (important so `vercel.json` crons apply to the Next app):
   - `vercel` — follow prompts; set **Root Directory** to `web` if you deploy from the monorepo root in the dashboard instead.
4. Add **environment variables** in the Vercel project:

   **Required for Supabase**

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

   **Optional (Run Scoring + cron on Vercel)**

   - `GITHUB_TRIGGER_TOKEN`
   - `GITHUB_REPO`
   - `CRON_SECRET` — random string; Vercel sends `Authorization: Bearer <CRON_SECRET>` to `/api/cron/trigger-scoring`
   - Optional: `GITHUB_WORKFLOW_FILE`, `GITHUB_BRANCH`

5. Redeploy after changing env vars.

`web/vercel.json` schedules **06:00 UTC** daily on `/api/cron/trigger-scoring`. You can rely on **GitHub’s cron only** and delete the Vercel cron block if you prefer a single scheduler.

## 6. Local dev against Supabase

Create `web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Restart `npm run dev`. Leave these unset to keep using `shop.db` as before.

## 7. Assignment wording vs “fraud” queue

The course brief mentions a late-delivery queue; this deployment ranks by **fraud probability** from your notebook and stores it in `order_predictions.fraud_probability`. You can rename labels in the UI or add a second model later.
