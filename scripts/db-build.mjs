/**
 * Rebuild data/person.sqlite from data/sql/schema.sql + seed/*.sql
 */
import { buildDbFromSql } from "./lib/db.mjs";

buildDbFromSql().catch((err) => {
  console.error(err);
  process.exit(1);
});
