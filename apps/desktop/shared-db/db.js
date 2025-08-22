// apps/desktop/shared-db/db.js
const Database = require('better-sqlite3');
import { createSchema } from "./schema.js";
import path from "path";
import fs from "fs";

export function openDb(appDataDir) {
  const dbPath = path.join(appDataDir, "emr-pos.sqlite");
  fs.mkdirSync(appDataDir, { recursive: true });
  const db = new Database(dbPath, { verbose: null });
  createSchema(db);
  return db;
}
