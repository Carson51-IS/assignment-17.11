import { createSupabaseAdmin } from "@/lib/supabase-admin";

export type CustomerRow = {
  customer_id: number;
  full_name: string;
  email: string;
};

export type ProductRow = {
  product_id: number;
  product_name: string;
  price: number;
};

export type OrderSummaryRow = {
  order_id: number;
  order_timestamp: string;
  fulfilled: number;
  total_value: number;
};

export async function fetchCustomers(): Promise<CustomerRow[]> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("customers")
    .select("customer_id, full_name, email")
    .order("full_name");
  if (error) throw new Error(error.message);
  return (data ?? []) as CustomerRow[];
}

export async function fetchCustomerProfile(
  customerId: number
): Promise<{ full_name: string; email: string } | undefined> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("customers")
    .select("full_name, email")
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as { full_name: string; email: string } | undefined;
}

export async function fetchDashboardTotals(
  customerId: number
): Promise<{ n: number; spend: number }> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("orders")
    .select("order_total")
    .eq("customer_id", customerId);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return {
    n: rows.length,
    spend: rows.reduce((s, r) => s + Number(r.order_total ?? 0), 0),
  };
}

export async function fetchRecentOrders(
  customerId: number,
  limit = 5
): Promise<OrderSummaryRow[]> {
  const sb = createSupabaseAdmin();
  const { data: orders, error } = await sb
    .from("orders")
    .select("order_id, order_datetime, order_total")
    .eq("customer_id", customerId)
    .order("order_datetime", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const list = orders ?? [];
  if (list.length === 0) return [];
  const ids = list.map((o) => o.order_id);
  const { data: shipRows } = await sb
    .from("shipments")
    .select("order_id")
    .in("order_id", ids);
  const shipped = new Set((shipRows ?? []).map((s) => s.order_id));
  return list.map((o) => ({
    order_id: o.order_id,
    order_timestamp: String(o.order_datetime),
    fulfilled: shipped.has(o.order_id) ? 1 : 0,
    total_value: Number(o.order_total),
  }));
}

export async function fetchOrderHistory(
  customerId: number
): Promise<OrderSummaryRow[]> {
  const sb = createSupabaseAdmin();
  const { data: orders, error } = await sb
    .from("orders")
    .select("order_id, order_datetime, order_total")
    .eq("customer_id", customerId)
    .order("order_datetime", { ascending: false });
  if (error) throw new Error(error.message);
  const list = orders ?? [];
  if (list.length === 0) return [];
  const ids = list.map((o) => o.order_id);
  const { data: shipRows } = await sb
    .from("shipments")
    .select("order_id")
    .in("order_id", ids);
  const shipped = new Set((shipRows ?? []).map((s) => s.order_id));
  return list.map((o) => ({
    order_id: o.order_id,
    order_timestamp: String(o.order_datetime),
    fulfilled: shipped.has(o.order_id) ? 1 : 0,
    total_value: Number(o.order_total),
  }));
}

export async function fetchOrderHeader(orderId: number): Promise<
  | {
      order_id: number;
      customer_id: number;
      order_timestamp: string;
      fulfilled: number;
      total_value: number;
    }
  | undefined
> {
  const sb = createSupabaseAdmin();
  const { data: o, error } = await sb
    .from("orders")
    .select("order_id, customer_id, order_datetime, order_total")
    .eq("order_id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!o) return undefined;
  const { data: ship } = await sb
    .from("shipments")
    .select("order_id")
    .eq("order_id", orderId)
    .maybeSingle();
  return {
    order_id: o.order_id,
    customer_id: o.customer_id,
    order_timestamp: String(o.order_datetime),
    fulfilled: ship ? 1 : 0,
    total_value: Number(o.order_total),
  };
}

export async function fetchOrderLines(orderId: number): Promise<
  {
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[]
> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("order_items")
    .select("quantity, unit_price, line_total, products(product_name)")
    .eq("order_id", orderId)
    .order("order_item_id");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => {
    const raw = r.products as unknown;
    const p = Array.isArray(raw) ? raw[0] : raw;
    const name =
      p && typeof p === "object" && p !== null && "product_name" in p
        ? String((p as { product_name: string }).product_name)
        : "";
    return {
      product_name: name,
      quantity: r.quantity,
      unit_price: Number(r.unit_price),
      line_total: Number(r.line_total),
    };
  });
}

export async function fetchProducts(): Promise<ProductRow[]> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("products")
    .select("product_id, product_name, price")
    .order("product_name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    product_id: r.product_id,
    product_name: r.product_name,
    price: Number(r.price),
  }));
}

export async function fetchWarehousePriority(): Promise<
  Record<string, unknown>[]
> {
  const sb = createSupabaseAdmin();
  const { data, error } = await sb
    .from("warehouse_priority_rows")
    .select("*")
    .order("fraud_probability", { ascending: false })
    .order("order_timestamp", { ascending: true })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}
