const SUPABASE_TABLES = [
  "customers",
  "products",
  "orders",
  "order_items",
  "shipments",
  "product_reviews",
  "order_predictions",
  "warehouse_priority_rows (view)",
  "place_shop_order (function)",
];

export default function SchemaDebugPage() {
  return (
    <>
      <h1>Debug: schema</h1>
      <p>
        Database is hosted on <strong>Supabase Postgres</strong>. Open the
        Table Editor in the Supabase dashboard to inspect columns and data.
      </p>
      <div className="card">
        <h2>Public objects</h2>
        <ul>
          {SUPABASE_TABLES.map((t) => (
            <li key={t}>
              <code>{t}</code>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
