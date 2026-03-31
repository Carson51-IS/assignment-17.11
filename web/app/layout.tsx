import "./globals.css";
import { cookies } from "next/headers";
import Link from "next/link";
import { getDb } from "@/lib/db";

export const metadata = {
  title: "Shop Ops",
  description: "IS 455 Ch.17 demo app",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const cid = jar.get("customer_id")?.value;
  let customerLabel: string | null = null;
  if (cid) {
    try {
      const db = getDb();
      const row = db
        .prepare(
          "SELECT first_name, last_name, email FROM customers WHERE customer_id = ?"
        )
        .get(Number(cid)) as
        | { first_name: string; last_name: string; email: string }
        | undefined;
      if (row) {
        customerLabel = `${row.first_name} ${row.last_name} (${row.email})`;
      }
    } catch {
      customerLabel = null;
    }
  }

  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <nav>
            <Link href="/select-customer">Select Customer</Link>
            <Link href="/dashboard">Customer Dashboard</Link>
            <Link href="/place-order">Place Order</Link>
            <Link href="/orders">Order History</Link>
            <Link href="/warehouse/priority">Warehouse Priority Queue</Link>
            <Link href="/scoring">Run Scoring</Link>
            <Link href="/debug/schema">Debug schema</Link>
          </nav>
        </header>
        {customerLabel ? (
          <div className="banner">
            Acting as customer #{cid}: {customerLabel}
          </div>
        ) : (
          <div className="banner">No customer selected — start at Select Customer.</div>
        )}
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
