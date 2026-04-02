import { fetchOrderHeader, fetchOrderLines } from "@/lib/shop-data";
import { getSelectedCustomerId } from "@/lib/session";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ order_id: string }>;
}) {
  const customerId = await getSelectedCustomerId();
  if (customerId == null) redirect("/select-customer");

  const { order_id: raw } = await params;
  const orderId = Number(raw);
  if (!Number.isFinite(orderId)) notFound();

  const order = await fetchOrderHeader(orderId);

  if (!order || order.customer_id !== customerId) {
    notFound();
  }

  const lines = await fetchOrderLines(orderId);

  return (
    <>
      <p>
        <Link href="/orders">← Back to orders</Link>
      </p>
      <h1>Order #{order.order_id}</h1>
      <div className="card">
        <p>Placed: {order.order_timestamp}</p>
        <p>Fulfilled: {order.fulfilled ? "Yes" : "No"}</p>
        <p>Order total: ${order.total_value.toFixed(2)}</p>
      </div>
      <h2>Line items</h2>
      <div className="table-wrap card">
        <table className="data">
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Line total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td>{l.product_name}</td>
                <td>{l.quantity}</td>
                <td>${l.unit_price.toFixed(2)}</td>
                <td>${l.line_total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
