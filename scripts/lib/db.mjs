/**
 * SQLite canónico (Node 24+ node:sqlite).
 * Fuente en git: data/sql/schema.sql + data/sql/seed/*.sql
 * Artefacto local: data/person.sqlite (gitignore)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, readFile, writeFile, readdir, access } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const DATA_DIR = path.join(ROOT, "data");
export const SQL_DIR = path.join(DATA_DIR, "sql");
export const SCHEMA_PATH = path.join(SQL_DIR, "schema.sql");
export const SEED_DIR = path.join(SQL_DIR, "seed");
export const DEFAULT_DB_PATH = path.join(DATA_DIR, "person.sqlite");
/** Override with `PERSON_DB_PATH` (tests / temp copies). */
export function getDbPath() {
  return process.env.PERSON_DB_PATH || DEFAULT_DB_PATH;
}
export const DB_PATH = DEFAULT_DB_PATH;
export const PIPELINE_TEST_DIR = path.join(DATA_DIR, "pipeline_test");

export const PERSON_DOCENTE_ID = "docente:ferestrepoca";
export const PERSON_EMAIL_LOCAL = "ferestrepoca";

export function sqlQuote(value) {
  if (value == null) return "''";
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

/** All values as strings (parity with former CSV rows). */
export function rowToStrings(row) {
  const o = {};
  for (const [k, v] of Object.entries(row)) {
    o[k] = v == null ? "" : String(v);
  }
  return o;
}

export function openDb(opts = {}) {
  const { readOnly = false } = opts;
  return new DatabaseSync(getDbPath(), { readOnly });
}

export function readTable(db, table) {
  return db.prepare(`SELECT * FROM ${quoteIdent(table)}`).all().map(rowToStrings);
}

export function tableColumns(db, table) {
  return db
    .prepare(`PRAGMA table_info(${quoteIdent(table)})`)
    .all()
    .map((c) => c.name);
}

export function replaceTable(db, table, rows, columns) {
  const cols = columns ?? (rows[0] ? Object.keys(rows[0]) : tableColumns(db, table));
  db.exec("BEGIN");
  try {
    db.exec(`DELETE FROM ${quoteIdent(table)}`);
    if (rows.length && cols.length) {
      const placeholders = cols.map(() => "?").join(", ");
      const sql = `INSERT INTO ${quoteIdent(table)} (${cols.map(quoteIdent).join(", ")}) VALUES (${placeholders})`;
      const stmt = db.prepare(sql);
      for (const row of rows) {
        stmt.run(
          ...cols.map((c) => {
            const v = row[c];
            return v == null ? "" : String(v);
          }),
        );
      }
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function seedFileName(table) {
  return `${table}.sql`;
}

export function dumpTableSeed(db, table) {
  const cols = tableColumns(db, table);
  const rows = db.prepare(`SELECT * FROM ${quoteIdent(table)}`).all();
  const lines = [
    `-- seed: ${table} (${rows.length} rows)`,
    `DELETE FROM ${quoteIdent(table)};`,
  ];
  for (const row of rows) {
    const values = cols.map((c) => sqlQuote(row[c] == null ? "" : row[c]));
    lines.push(
      `INSERT INTO ${quoteIdent(table)} (${cols.map(quoteIdent).join(", ")}) VALUES (${values.join(", ")});`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

export async function writeTableSeed(db, table) {
  await mkdir(SEED_DIR, { recursive: true });
  const file = path.join(SEED_DIR, seedFileName(table));
  await writeFile(file, dumpTableSeed(db, table), "utf8");
  return file;
}

export async function writeSeeds(db, tables) {
  const written = [];
  for (const table of tables) {
    written.push(await writeTableSeed(db, table));
  }
  return written;
}

export async function dbExists() {
  try {
    await access(getDbPath());
    return true;
  } catch {
    return false;
  }
}

export async function buildDbFromSql({ quiet = false } = {}) {
  const dbPath = getDbPath();
  await mkdir(path.dirname(dbPath), { recursive: true });
  const schema = await readFile(SCHEMA_PATH, "utf8");
  const seedNames = (await readdir(SEED_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();

  try {
    const { unlink } = await import("node:fs/promises");
    await unlink(dbPath);
  } catch {
    /* missing ok */
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = OFF;");
  db.exec(schema);
  for (const name of seedNames) {
    const sql = await readFile(path.join(SEED_DIR, name), "utf8");
    db.exec(sql);
    if (!quiet) console.log(`  seed ${name}`);
  }
  db.exec("PRAGMA foreign_keys = ON;");
  db.close();
  if (!quiet) console.log(`built ${path.relative(ROOT, dbPath)} (${seedNames.length} seeds)`);
  return dbPath;
}

export async function ensureDb({ rebuild = false } = {}) {
  if (rebuild || !(await dbExists())) {
    await buildDbFromSql({ quiet: false });
  }
  return openDb();
}

export { ROOT };
