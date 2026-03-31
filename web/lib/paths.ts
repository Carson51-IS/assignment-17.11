import path from "path";

/** Assignment root (parent of `web/` where `data/shop.db` lives). */
export function getAssignmentRoot(): string {
  return path.resolve(process.cwd(), "..");
}

export function getShopDbPath(): string {
  return path.join(getAssignmentRoot(), "data", "shop.db");
}
