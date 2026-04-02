import { NextRequest, NextResponse } from "next/server";

/**
 * Optional: Vercel Cron hits this route to queue the same GitHub Action as
 * “Run Scoring”. Configure CRON_SECRET in Vercel and the same GitHub env vars
 * as runScoringAction on Vercel.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.GITHUB_TRIGGER_TOKEN?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  if (!token || !repo) {
    return NextResponse.json(
      { error: "GITHUB_TRIGGER_TOKEN and GITHUB_REPO required" },
      { status: 501 }
    );
  }

  const parts = repo.split("/");
  if (parts.length !== 2) {
    return NextResponse.json({ error: "GITHUB_REPO must be owner/name" }, { status: 400 });
  }
  const [owner, name] = parts;
  const workflow =
    process.env.GITHUB_WORKFLOW_FILE?.trim() || "fraud-scoring.yml";
  const ref = process.env.GITHUB_BRANCH?.trim() || "main";

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${name}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ ref }),
    }
  );

  if (!res.ok) {
    const t = await res.text();
    return NextResponse.json({ error: t }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
