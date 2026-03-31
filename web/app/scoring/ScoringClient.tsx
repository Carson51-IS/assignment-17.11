"use client";

import { useState } from "react";
import Link from "next/link";
import { runScoringAction, type ScoringResult } from "./actions";

export function ScoringClient() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScoringResult | null>(null);

  async function onRun() {
    setBusy(true);
    setResult(null);
    try {
      const r = await runScoringAction();
      setResult(r);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p>
        <button type="button" className="btn" onClick={onRun} disabled={busy}>
          {busy ? "Running…" : "Run Scoring"}
        </button>
      </p>
      {result ? (
        <div className={result.ok ? "success" : "error"}>
          <p>
            <strong>{result.ok ? "Success" : "Failure"}</strong> at{" "}
            {result.finishedAt}
          </p>
          {result.ok && result.count != null ? (
            <p>
              Orders scored: <strong>{result.count}</strong>
            </p>
          ) : null}
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontSize: "0.8rem",
              margin: "0.5rem 0 0",
              maxHeight: "240px",
              overflow: "auto",
            }}
          >
            {result.output}
          </pre>
          {result.ok ? (
            <p style={{ marginTop: "1rem" }}>
              <Link href="/warehouse/priority">Open priority queue →</Link>
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
