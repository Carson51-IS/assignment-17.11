"use server";

import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getSelectedCustomerId } from "@/lib/session";

export type LineInput = { product_id: number; quantity: number };

export async function placeOrderAction(
  lines: LineInput[]
): Promise<
  | { ok: true; orderId: number }
  | { ok: false; error: string; code?: "NO_CUSTOMER" }
> {
  const customerId = await getSelectedCustomerId();
  if (customerId == null) {
    return { ok: false, error: "No customer selected.", code: "NO_CUSTOMER" };
  }

  const cleaned = lines.filter(
    (l) => Number.isFinite(l.product_id) && l.quantity > 0
  );
  if (cleaned.length === 0) {
    return { ok: false, error: "Add at least one line with quantity ≥ 1." };
  }

  const sb = createSupabaseAdmin();
  let subtotal = 0;
  const resolved: { product_id: number; quantity: number; price: number }[] =
    [];

  for (const line of cleaned) {
    const { data, error } = await sb
      .from("products")
      .select("price")
      .eq("product_id", line.product_id)
      .eq("is_active", true)
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) {
      return { ok: false, error: `Unknown or inactive product_id ${line.product_id}.` };
    }
    const price = Number(data.price);
    const q = Math.floor(line.quantity);
    if (q < 1) {
      return { ok: false, error: "Quantities must be whole numbers ≥ 1." };
    }
    resolved.push({ product_id: line.product_id, quantity: q, price });
    subtotal += price * q;
  }

  subtotal = Math.round(subtotal * 100) / 100;
  const orderTotal = subtotal;
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);

  try {
    const p_lines = resolved.map((r) => ({
      product_id: r.product_id,
      quantity: r.quantity,
      unit_price: r.price,
      line_total: Math.round(r.quantity * r.price * 100) / 100,
    }));
    const { data, error } = await sb.rpc("place_shop_order", {
      p_customer_id: customerId,
      p_order_datetime: ts,
      p_order_subtotal: subtotal,
      p_order_total: orderTotal,
      p_lines: p_lines,
    });
    if (error) return { ok: false, error: error.message };
    const orderId = Number(data);
    if (!Number.isFinite(orderId)) {
      return { ok: false, error: "Unexpected response from database." };
    }
    return { ok: true, orderId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error";
    return { ok: false, error: msg };
  }
}
