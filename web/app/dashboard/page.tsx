import {
  fetchCustomerProfile,
  fetchDashboardTotals,
  fetchRecentOrders,
} from "@/lib/shop-data";
import { getSelectedCustomerId } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const customerId = await getSelectedCustomerId();
  if (customerId == null) redirect("/select-customer");

  const customer = await fetchCustomerProfile(customerId);

  if (!customer) {
    redirect("/select-customer?error=missing");
  }

  const totals = await fetchDashboardTotals(customerId);
  const recent = await fetchRecentOrders(customerId, 5);

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
