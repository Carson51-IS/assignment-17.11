import { getDb } from "@/lib/db";
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

  const order = getDb()
    .prepare(
      `SELECT order_id, customer_id, order_timestamp, fulfilled, total_value
       FROM orders WHERE order_id = ?`
    )
    .get(orderId) as
    | {
        order_id: number;
        customer_id: number;
        order_timestamp: string;
        fulfilled: number;
        total_value: number;
      }
    | undefined;

  if (!order || order.customer_id !== customerId) {
    notFound();
  }

  const lines = getDb()
    .prepare(
      `SELECT p.product_name, oi.quantity, oi.unit_price,
              (oi.quantity * oi.unit_price) AS line_total
       FROM order_items oi
       JOIN products p ON p.product_id = oi.product_id
       WHERE oi.order_id = ?
       ORDER BY oi.order_item_id`
    )
    .all(orderId) as {
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];

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
