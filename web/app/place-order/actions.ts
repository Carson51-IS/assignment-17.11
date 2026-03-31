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
    "SELECT price FROM products WHERE product_id = ? AND is_active = 1"
  );

  let subtotal = 0;

  const resolved: { product_id: number; quantity: number; price: number }[] = [];

  for (const line of cleaned) {
    const p = productStmt.get(line.product_id) as { price: number } | undefined;
    if (!p) {
      return {
        ok: false as const,
        error: `Unknown or inactive product_id ${line.product_id}.`,
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
    });
    subtotal += p.price * q;
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const shippingFee = 0;
  const taxAmount = 0;
  const orderTotal = Math.round((subtotal + shippingFee + taxAmount) * 100) / 100;
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);

  let newOrderId = 0;
  const trx = db.transaction(() => {
    const insOrder = db.prepare(
      `INSERT INTO orders (
        customer_id, order_datetime,
        billing_zip, shipping_zip, shipping_state,
        payment_method, device_type, ip_country,
        promo_used, promo_code,
        order_subtotal, shipping_fee, tax_amount, order_total,
        risk_score, is_fraud
      ) VALUES (?, ?, '', '', '', 'card', 'web', 'US', 0, NULL, ?, 0, 0, ?, 0, 0)`
    );
    const insLine = db.prepare(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total)
       VALUES (?, ?, ?, ?, ?)`
    );

    const info = insOrder.run(
      customerId,
      ts,
      subtotal,
      orderTotal
    );
    newOrderId = Number(info.lastInsertRowid);

    for (const r of resolved) {
      const lineTotal = Math.round(r.quantity * r.price * 100) / 100;
      insLine.run(newOrderId, r.product_id, r.quantity, r.price, lineTotal);
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
