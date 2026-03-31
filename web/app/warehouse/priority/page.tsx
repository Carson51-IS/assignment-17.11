import { getDb } from "@/lib/db";

/** Course schema: timestamps on `order_datetime`, totals on `order_total`, customer name in `full_name`.
 *  “Unfulfilled” = no row in `shipments` yet (new orders from the app stay in this state until shipped).
 */
const PRIORITY_SQL = `
SELECT
  o.order_id,
  o.order_datetime AS order_timestamp,
  o.order_total AS total_value,
  (CASE WHEN EXISTS (SELECT 1 FROM shipments s WHERE s.order_id = o.order_id)
   THEN 1 ELSE 0 END) AS fulfilled,
  c.customer_id,
  c.full_name AS customer_name,
  p.late_delivery_probability,
  p.predicted_late_delivery,
  p.prediction_timestamp
FROM orders o
JOIN customers c ON c.customer_id = o.customer_id
JOIN order_predictions p ON p.order_id = o.order_id
WHERE NOT EXISTS (SELECT 1 FROM shipments s WHERE s.order_id = o.order_id)
ORDER BY p.late_delivery_probability DESC, o.order_datetime ASC
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
        Unfulfilled orders (no shipment record yet) ranked by model-estimated
        probability of late delivery. Run <strong>Run Scoring</strong> after
        placing orders so they appear in <code>order_predictions</code>.
      </p>
      {err ? <div className="error">{err}</div> : null}
      {!err && rows.length === 0 ? (
        <div className="card">
          <p>
            No rows to show. Place a new order (it will not have a shipment
            yet), run scoring, then refresh this page.
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
