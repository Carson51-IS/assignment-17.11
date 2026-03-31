import { getDb } from "@/lib/db";

const PRIORITY_SQL = `
SELECT
  o.order_id,
  o.order_timestamp,
  o.total_value,
  o.fulfilled,
  c.customer_id,
  c.first_name || ' ' || c.last_name AS customer_name,
  p.late_delivery_probability,
  p.predicted_late_delivery,
  p.prediction_timestamp
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
JOIN order_predictions p ON p.order_id = o.order_id
WHERE o.fulfilled = 0
ORDER BY p.late_delivery_probability DESC, o.order_timestamp ASC
LIMIT 50
`;

export default function WarehousePriorityPage() {
  let rows: Record<string, unknown>[] = [];
  let err: string | null = null;
  try {
    rows = getDb().prepare(PRIORITY_SQL).all() as Record<string, unknown>[];
  } catch (e) {
    err = e instanceof Error ? e.message : "Query failed";
  }

  const columns =
    rows.length > 0
      ? Object.keys(rows[0])
      : [
          "order_id",
          "order_timestamp",
          "total_value",
          "fulfilled",
          "customer_id",
          "customer_name",
          "late_delivery_probability",
          "predicted_late_delivery",
          "prediction_timestamp",
        ];

  return (
    <>
      <h1>Late Delivery Priority Queue</h1>
      <p>
        Unfulfilled orders ranked by model-estimated probability of late
        delivery. Warehouse staff can pull from the top first to reduce delay
        risk. Predictions come from the <code>order_predictions</code> table
        populated by the Python inference job.
      </p>
      {err ? <div className="error">{err}</div> : null}
      {!err && rows.length === 0 ? (
        <div className="card">
          <p>
            No rows to show. Ensure unfulfilled orders exist and run{" "}
            <strong>Run Scoring</strong> so <code>order_predictions</code> is
            populated.
          </p>
        </div>
      ) : null}
      {!err && rows.length > 0 ? (
        <div className="table-wrap card">
          <table className="data">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {columns.map((c) => (
                    <td key={c}>{String(r[c] ?? "")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
