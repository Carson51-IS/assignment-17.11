"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { placeOrderAction, type LineInput } from "./actions";

export type ProductRow = {
  product_id: number;
  product_name: string;
  price: number;
};

type LineState = { product_id: string; quantity: string };

export function PlaceOrderForm({ products }: { products: ProductRow[] }) {
  const router = useRouter();
  const [lines, setLines] = useState<LineState[]>([
    { product_id: "", quantity: "1" },
  ]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const parsed: LineInput[] = [];
    for (const line of lines) {
      const pid = Number(line.product_id);
      const q = Number(line.quantity);
      if (line.product_id === "") continue;
      if (!Number.isFinite(pid) || !Number.isFinite(q)) {
        setMessage("Each line needs a product and a numeric quantity.");
        return;
      }
      parsed.push({ product_id: pid, quantity: q });
    }
    if (parsed.length === 0) {
      setMessage("Add at least one line item.");
      return;
    }
    setPending(true);
    const result = await placeOrderAction(parsed);
    setPending(false);
    if (!result.ok) {
      if (result.code === "NO_CUSTOMER") {
        router.push("/select-customer");
        return;
      }
      setMessage(result.error);
      return;
    }
    router.push("/orders?placed=1");
  }

  return (
    <form onSubmit={onSubmit}>
      {message ? <div className="error">{message}</div> : null}
      {lines.map((line, i) => (
        <div key={i} style={{ marginBottom: "0.75rem" }}>
          <label>
            Product{" "}
            <select
              value={line.product_id}
              onChange={(e) => {
                const next = [...lines];
                next[i] = { ...next[i], product_id: e.target.value };
                setLines(next);
              }}
              required={i === 0}
            >
              <option value="">Choose…</option>
              {products.map((p) => (
                <option key={p.product_id} value={p.product_id}>
                  {p.product_name} (${p.price.toFixed(2)})
                </option>
              ))}
            </select>
          </label>{" "}
          <label>
            Qty{" "}
            <input
              type="number"
              min={1}
              step={1}
              value={line.quantity}
              onChange={(e) => {
                const next = [...lines];
                next[i] = { ...next[i], quantity: e.target.value };
                setLines(next);
              }}
            />
          </label>
          {lines.length > 1 ? (
            <button
              type="button"
              className="btn secondary"
              style={{ marginLeft: "0.5rem" }}
              onClick={() => setLines(lines.filter((_, j) => j !== i))}
            >
              Remove
            </button>
          ) : null}
        </div>
      ))}
      <p>
        <button
          type="button"
          className="btn secondary"
          onClick={() =>
            setLines([...lines, { product_id: "", quantity: "1" }])
          }
        >
          Add line
        </button>
      </p>
      <p>
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Placing…" : "Place order"}
        </button>
      </p>
    </form>
  );
}
