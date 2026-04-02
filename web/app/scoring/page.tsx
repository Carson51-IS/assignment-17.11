import { ScoringClient } from "./ScoringClient";

export default function ScoringPage() {
  return (
    <>
      <h1>Run Scoring</h1>
      <p>
        Triggers the ML inference job that scores unfulfilled orders and writes
        results to <code>order_predictions</code>. Locally this runs Python;
        on Vercel it queues a GitHub Actions workflow.
      </p>
      <div className="card">
        <ScoringClient />
      </div>
    </>
  );
}
