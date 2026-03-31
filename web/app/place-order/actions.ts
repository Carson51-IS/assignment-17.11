"use server";

import { getDb } from "@/lib/db";
import { getSelectedCustomerId } from "@/lib/session";

export type LineInput = { product_id: number; quantity: number };

export async function placeOrderAction(
  lines: LineInput[]
): Promise<
  { ok: true; orderId: number } | { ok: false; error: string; code?: "NO_CUSTOMER" }
> {
  const customerId = await getSelectedCustomerId();
  if (customerId == null) {
    return {
      ok: false,
      error: "No customer selected.",
      code: "NO_CUSTOMER",
    };
  }

  const cleaned = lines.filter(
    (l) => Number.isFinite(l.product_id) && l.quantity > 0
  );
  if (cleaned.length === 0) {
    return { ok: false as const, error: "Add at least one line with quantity ≥ 1." };
  }

  const db = getDb();
  const productStmt = db.prepare(
    "SELECT price, weight FROM products WHERE product_id = ?"
  );

  let totalValue = 0;
  let numItems = 0;
  let weightSum = 0;

  const resolved: { product_id: number; quantity: number; price: number; weight: number }[] =
    [];

  for (const line of cleaned) {
    const p = productStmt.get(line.product_id) as
      | { price: number; weight: number }
      | undefined;
    if (!p) {
      return {
        ok: false as const,
        error: `Unknown product_id ${line.product_id}.`,
      };
    }
    const q = Math.floor(line.quantity);
    if (q < 1) {
      return { ok: false as const, error: "Quantities must be whole numbers ≥ 1." };
    }
    resolved.push({
      product_id: line.product_id,
      quantity: q,
      price: p.price,
      weight: p.weight,
    });
    totalValue += p.price * q;
    numItems += q;
    weightSum += p.weight * q;
  }

  const avgWeight = numItems > 0 ? weightSum / numItems : 0;
  const ts = new Date().toISOString();

  let newOrderId = 0;
  const trx = db.transaction(() => {
    const insOrder = db.prepare(
      `INSERT INTO orders (customer_id, order_timestamp, fulfilled, total_value, num_items, avg_weight, late_delivery, is_fraud)
       VALUES (?, ?, 0, ?, ?, ?, NULL, 0)`
    );
    const insLine = db.prepare(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
       VALUES (?, ?, ?, ?)`
    );

    const info = insOrder.run(
      customerId,
      ts,
      Math.round(totalValue * 100) / 100,
      numItems,
      Math.round(avgWeight * 10000) / 10000
    );
    newOrderId = Number(info.lastInsertRowid);

    for (const r of resolved) {
      insLine.run(newOrderId, r.product_id, r.quantity, r.price);
    }
  });

  try {
    trx();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error";
    return { ok: false as const, error: msg };
  }

  return { ok: true, orderId: newOrderId };
}
