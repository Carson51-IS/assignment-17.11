"use server";

import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { getAssignmentRoot } from "@/lib/paths";

const execFileAsync = promisify(execFile);

function pythonBin(): string {
  return process.env.PYTHON_EXE || "python";
}

async function triggerGithubScoringWorkflow(): Promise<{
  ok: boolean;
  output: string;
}> {
  const token = process.env.GITHUB_TRIGGER_TOKEN?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  if (!token || !repo) {
    return { ok: false, output: "" };
  }
  const parts = repo.split("/");
  if (parts.length !== 2) {
    return {
      ok: false,
      output: `GITHUB_REPO must be owner/name, got: ${repo}`,
    };
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
    return {
      ok: false,
      output: `GitHub API ${res.status}: ${t}`,
    };
  }
  return {
    ok: true,
    output:
      "Queued workflow on GitHub Actions. Scores appear in Supabase in ~1–2 minutes.",
  };
}

export type ScoringResult =
  | {
      ok: true;
      output: string;
      count?: number;
      finishedAt: string;
    }
  | {
      ok: false;
      output: string;
      finishedAt: string;
    };

export async function runScoringAction(): Promise<ScoringResult> {
  const finishedAt = new Date().toISOString();

  if (process.env.VERCEL) {
    const gh = await triggerGithubScoringWorkflow();
    if (gh.ok) {
      return { ok: true, output: gh.output, finishedAt };
    }
    return {
      ok: false,
      output:
        gh.output ||
        "On Vercel, configure GITHUB_TRIGGER_TOKEN and GITHUB_REPO (owner/name) so Run Scoring can queue the GitHub Actions workflow, or run scoring locally with Python.",
      finishedAt,
    };
  }

  const ghFirst = process.env.SCORING_USE_GITHUB === "1";
  if (ghFirst) {
    const gh = await triggerGithubScoringWorkflow();
    if (gh.ok) {
      return { ok: true, output: gh.output, finishedAt };
    }
  }

  const root = getAssignmentRoot();
  const script = path.join(root, "jobs", "run_fraud_inference.py");

  try {
    const { stdout, stderr } = await execFileAsync(pythonBin(), [script], {
      cwd: root,
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    });
    const combined = [stdout, stderr].filter(Boolean).join("\n").trim();
    const m = combined.match(/Predictions written:\s*(\d+)/i);
    const count = m ? Number(m[1]) : undefined;
    return {
      ok: true,
      output: combined || "(no stdout)",
      count,
      finishedAt,
    };
  } catch (e: unknown) {
    const err = e as {
      stdout?: Buffer;
      stderr?: Buffer;
      message?: string;
    };
    const pieces = [
      err.stderr && String(err.stderr),
      err.stdout && String(err.stdout),
      err.message,
    ].filter(Boolean);
    return {
      ok: false,
      output: pieces.join("\n").trim() || "Scoring failed.",
      finishedAt,
    };
  }
}
