import { getDb } from "@/lib/db";
import { getSelectedCustomerId } from "@/lib/session";
import { redirect } from "next/navigation";
import { PlaceOrderForm, type ProductRow } from "./PlaceOrderForm";

export default async function PlaceOrderPage() {
  const customerId = await getSelectedCustomerId();
  if (customerId == null) redirect("/select-customer");

  const products = getDb()
    .prepare(
      `SELECT product_id, product_name, price FROM products ORDER BY product_name`
    )
    .all() as ProductRow[];

  return (
    <>
      <h1>Place order</h1>
      <p>
        Create a new unfulfilled order for the selected customer. Inserts use a
        single database transaction.
      </p>
      <div className="card">
        <PlaceOrderForm products={products} />
      </div>
    </>
  );
}
