"use client";

import { useMemo, useState } from "react";
import { selectCustomerAction } from "./actions";

export type CustomerRow = {
  customer_id: number;
  full_name: string;
  email: string;
};

export function CustomerPicker({ customers }: { customers: CustomerRow[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(s) ||
        c.email.toLowerCase().includes(s) ||
        String(c.customer_id).includes(s)
    );
  }, [customers, q]);

  return (
    <>
      <p>
        <label htmlFor="search">Search: </label>
        <input
          id="search"
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name or email"
        />
      </p>
      <div className="table-wrap card">
        <table className="data">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.customer_id}>
                <td>{c.customer_id}</td>
                <td>{c.full_name}</td>
                <td>{c.email}</td>
                <td>
                  <form action={selectCustomerAction}>
                    <input
                      type="hidden"
                      name="customer_id"
                      value={c.customer_id}
                    />
                    <button type="submit" className="btn secondary">
                      Act as this customer
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? (
          <p className="muted">
            <small>No matches.</small>
          </p>
        ) : null}
      </div>
    </>
  );
}
