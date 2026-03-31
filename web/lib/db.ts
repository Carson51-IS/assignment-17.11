import Database from "better-sqlite3";
import fs from "fs";
import { getShopDbPath } from "./paths";

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  const p = getShopDbPath();
  if (!fs.existsSync(p)) {
    throw new Error(
      `Database not found at ${p}. Run: python jobs/seed_shop_db.py (from assignment root) or add your course shop.db under data/.`
    );
  }
  _db = new Database(p);
  _db.pragma("foreign_keys = ON");
  return _db;
}
