import { ScoringClient } from "./ScoringClient";

export default function ScoringPage() {
  return (
    <>
      <h1>Run Scoring</h1>
      <p>
        Runs <code>python jobs/run_inference.py</code> from the assignment root
        (loads <code>late_delivery_model.sav</code> and updates{" "}
        <code>order_predictions</code>). Use the PYTHON_EXE environment variable
        if your interpreter is not named <code>python</code>.
      </p>
      <div className="card">
        <ScoringClient />
      </div>
    </>
  );
}
