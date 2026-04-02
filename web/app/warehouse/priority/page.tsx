import { fetchWarehousePriority } from "@/lib/shop-data";

export default async function WarehousePriorityPage() {
  let rows: Record<string, unknown>[] = [];
  let err: string | null = null;
  try {
    rows = await fetchWarehousePriority();
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
          "customer_id",
          "customer_name",
          "fraud_probability",
          "predicted_fraud",
          "prediction_timestamp",
        ];

  return (
    <>
      <h1>Late Delivery Priority Queue</h1>
      <p>
        Top 50 unfulfilled orders ranked by the ML model&apos;s predicted
        fraud probability. Place a new order then click{" "}
        <strong>Run Scoring</strong> to populate predictions.
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
