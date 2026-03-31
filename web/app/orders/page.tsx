import { getDb } from "@/lib/db";
import { getSelectedCustomerId } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ placed?: string }>;
}) {
  const customerId = await getSelectedCustomerId();
  if (customerId == null) redirect("/select-customer");

  const sp = await searchParams;

  const rows = getDb()
    .prepare(
      `SELECT
         o.order_id,
         o.order_datetime AS order_timestamp,
         (CASE WHEN EXISTS (SELECT 1 FROM shipments s WHERE s.order_id = o.order_id)
          THEN 1 ELSE 0 END) AS fulfilled,
         o.order_total AS total_value
       FROM orders o
       WHERE o.customer_id = ?
       ORDER BY datetime(o.order_datetime) DESC`
    )
    .all(customerId) as {
    order_id: number;
    order_timestamp: string;
    fulfilled: number;
    total_value: number;
  }[];

  return (
    <>
      <h1>Order history</h1>
      {sp.placed === "1" ? (
        <div className="success">Order placed successfully.</div>
      ) : null}
      <div className="table-wrap card">
        <table className="data">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Timestamp</th>
              <th>Fulfilled</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.order_id}>
                <td>{r.order_id}</td>
                <td>{r.order_timestamp}</td>
                <td>{r.fulfilled ? "Yes" : "No"}</td>
                <td>${r.total_value.toFixed(2)}</td>
                <td>
                  <Link href={`/orders/${r.order_id}`}>Details</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p>
            <small className="muted">No orders yet.</small>
          </p>
        ) : null}
      </div>
    </>
  );
}
