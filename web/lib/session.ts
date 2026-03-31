import { cookies } from "next/headers";

export async function getSelectedCustomerId(): Promise<number | null> {
  const jar = await cookies();
  const v = jar.get("customer_id")?.value;
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
