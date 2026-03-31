"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function selectCustomerAction(formData: FormData) {
  const raw = formData.get("customer_id");
  if (raw == null || raw === "") {
    redirect("/select-customer?error=missing");
  }
  const id = String(raw);
  const jar = await cookies();
  jar.set("customer_id", id, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
    sameSite: "lax",
  });
  redirect("/dashboard");
}
