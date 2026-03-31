import { getDb } from "@/lib/db";
import { getSelectedCustomerId } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const customerId = await getSelectedCustomerId();
  if (customerId == null) redirect("/select-customer");

  const db = getDb();
  const customer = db
    .prepare(
      "SELECT full_name, email FROM customers WHERE customer_id = ?"
    )
    .get(customerId) as { full_name: string; email: string } | undefined;

  if (!customer) {
    redirect("/select-customer?error=missing");
  }

  const totals = db
    .prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(order_total), 0) AS spend FROM orders WHERE customer_id = ?`
    )
    .get(customerId) as { n: number; spend: number };

  const recent = db
    .prepare(
      `SELECT
         o.order_id,
         o.order_datetime AS order_timestamp,
         (CASE WHEN EXISTS (SELECT 1 FROM shipments s WHERE s.order_id = o.order_id)
          THEN 1 ELSE 0 END) AS fulfilled,
         o.order_total AS total_value
       FROM orders o
       WHERE o.customer_id = ?
       ORDER BY datetime(o.order_datetime) DESC
       LIMIT 5`
    )
    .all(customerId) as {
    order_id: number;
    order_timestamp: string;
    fulfilled: number;
    total_value: number;
  }[];

  return (
    <>
      <h1>Customer dashboard</h1>
      <div className="card">
        <p>
          <strong>{customer.full_name}</strong>
        </p>
        <p>{customer.email}</p>
        <p>Total orders: {totals.n}</p>
        <p>Total spend: ${totals.spend.toFixed(2)}</p>
      </div>
      <h2>Recent orders</h2>
      <div className="table-wrap card">
        <table className="data">
          <thead>
            <tr>
              <th>Order</th>
              <th>When</th>
              <th>Fulfilled</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.order_id}>
                <td>{r.order_id}</td>
                <td>{r.order_timestamp}</td>
                <td>{r.fulfilled ? "Yes" : "No"}</td>
                <td>${r.total_value.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {recent.length === 0 ? (
          <p>
            <small className="muted">No orders yet.</small>
          </p>
        ) : null}
      </div>
    </>
  );
}
