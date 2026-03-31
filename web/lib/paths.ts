import path from "path";

/** Assignment root (`shop.db` lives here). Supports `npm run dev` from `web/` or from the repo root. */
export function getAssignmentRoot(): string {
  const cwd = process.cwd();
  if (path.basename(cwd) === "web") {
    return path.resolve(cwd, "..");
  }
  return cwd;
}

export function getShopDbPath(): string {
  return path.join(getAssignmentRoot(), "shop.db");
}
