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

  // Gerekli klas�rleri olu�tur
  fs.mkdirSync(dataDir, { recursive: true });

  const dbPath = path.join(dataDir, "emr-pos.sqlite3");

  // Dosya varsa a�ar, yoksa olu�turur
  const db = new Database(dbPath, {
    fileMustExist: false,
    timeout: 5000,
  });

  // Sa�laml�k/performans i�in mant�kl� pragmalar
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  return db;
}

export default { openDb };
