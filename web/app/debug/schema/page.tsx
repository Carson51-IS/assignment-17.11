import { getShopDbPath } from "@/lib/paths";
import Database from "better-sqlite3";
import fs from "fs";

type ColInfo = {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
};

export default async function SchemaDebugPage() {
  const pathStr = getShopDbPath();
  if (!fs.existsSync(pathStr)) {
    return (
      <>
        <h1>Debug: schema</h1>
        <div className="error">No database at {pathStr}</div>
      </>
    );
  }

  const db = new Database(pathStr, { readonly: true });
  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
    )
    .all() as { name: string }[];

  const info: { table: string; columns: ColInfo[] }[] = [];
  for (const t of tables) {
    const columns = db.prepare(`PRAGMA table_info(${t.name})`).all() as ColInfo[];
    info.push({ table: t.name, columns });
  }
  db.close();

  return (
    <>
      <h1>Debug: shop.db schema</h1>
      <p>
        <small className="muted">{pathStr}</small>
      </p>
      {info.map(({ table, columns }) => (
        <section key={table} className="card">
          <h2>{table}</h2>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>cid</th>
                  <th>name</th>
                  <th>type</th>
                  <th>notnull</th>
                  <th>dflt</th>
                  <th>pk</th>
                </tr>
              </thead>
              <tbody>
                {columns.map((c) => (
                  <tr key={c.name}>
                    <td>{c.cid}</td>
                    <td>{c.name}</td>
                    <td>{c.type}</td>
                    <td>{c.notnull}</td>
                    <td>{c.dflt_value ?? ""}</td>
                    <td>{c.pk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
