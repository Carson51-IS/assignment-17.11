"use server";

import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import { getAssignmentRoot } from "@/lib/paths";

const execFileAsync = promisify(execFile);

function pythonBin(): string {
  return process.env.PYTHON_EXE || "python";
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
  const root = getAssignmentRoot();
  const script = path.join(root, "jobs", "run_inference.py");
  const finishedAt = new Date().toISOString();

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
