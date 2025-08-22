// apps/desktop/shared-db/db.js  (ESM)
import fs from "fs";
import path from "path";
import os from "os";
import Database from "better-sqlite3";

/**
 * rootDir: genelde Electron'dan app.getPath("userData") gelecek
 */
export function openDb(rootDir) {
  const baseDir = rootDir || path.join(os.homedir(), ".emr-pos");
  const dataDir = path.join(baseDir, "data");

  // Gerekli klasörleri oluþtur
  fs.mkdirSync(dataDir, { recursive: true });

  const dbPath = path.join(dataDir, "emr-pos.sqlite3");

  // Dosya varsa açar, yoksa oluþturur
  const db = new Database(dbPath, {
    fileMustExist: false,
    timeout: 5000,
  });

  // Saðlamlýk/performans için mantýklý pragmalar
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  return db;
}

export default { openDb };
