import "./globals.css";
import { cookies } from "next/headers";
import Link from "next/link";
import { fetchCustomerProfile } from "@/lib/shop-data";

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
      const row = await fetchCustomerProfile(Number(cid));
      if (row) {
        customerLabel = `${row.full_name} (${row.email})`;
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
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/place-order">Place Order</Link>
            <Link href="/orders">Order History</Link>
            <Link href="/warehouse/priority">Priority Queue</Link>
            <Link href="/scoring">Run Scoring</Link>
          </nav>
        </header>
        {customerLabel ? (
          <div className="banner">
            Acting as customer #{cid}: {customerLabel}
          </div>
        ) : (
          <div className="banner">
            No customer selected — start at Select Customer.
          </div>
        )}
        <main className="page">{children}</main>
      </body>
    </html>
  );
}
