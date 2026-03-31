import { getDb } from "@/lib/db";
import { getSelectedCustomerId } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const customerId = await getSelectedCustomerId();
  if (customerId == null) redirect("/select-customer");

  const db = getDb();
  const customer = db
    .prepare(
      "SELECT first_name, last_name, email FROM customers WHERE customer_id = ?"
    )
    .get(customerId) as
    | { first_name: string; last_name: string; email: string }
    | undefined;

  if (!customer) {
    redirect("/select-customer?error=missing");
  }

  const totals = db
    .prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(total_value), 0) AS spend FROM orders WHERE customer_id = ?`
    )
    .get(customerId) as { n: number; spend: number };

  const recent = db
    .prepare(
      `SELECT order_id, order_timestamp, fulfilled, total_value
       FROM orders WHERE customer_id = ?
       ORDER BY datetime(order_timestamp) DESC
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
          <strong>
            {customer.first_name} {customer.last_name}
          </strong>
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
