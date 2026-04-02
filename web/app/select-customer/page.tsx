import { fetchCustomers } from "@/lib/shop-data";
import { CustomerPicker, type CustomerRow } from "./CustomerPicker";

export default async function SelectCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const resolved = await searchParams;

  let customers: CustomerRow[] = [];
  let loadError: string | null = null;
  try {
    customers = await fetchCustomers();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Failed to load database.";
  }

  return (
    <>
      <h1>Select Customer</h1>
      <p>
        Choose who you are acting as for this session. No login — selection is
        stored in a cookie.
      </p>
      {resolved.error === "missing" ? (
        <div className="error">Select a customer first.</div>
      ) : null}
      {loadError ? <div className="error">{loadError}</div> : null}
      {!loadError ? <CustomerPicker customers={customers} /> : null}
    </>
  );
}
