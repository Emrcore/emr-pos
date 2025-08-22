// ESM
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

/**
 * Uygulaman�n yaz�labilir veri klas�r�n� kullanarak
 * (�rn. Windows: %AppData%/EMR POS) SQLite dosyas� a�ar.
 * @param {string} baseDir app.getPath("userData") gibi bir klas�r
 */
export function openDb(baseDir) {
  const dataDir = path.join(baseDir, "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const dbPath = path.join(dataDir, "emr-pos.sqlite");
  const db = new Database(dbPath);

  // Sa�laml�k + performans
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");

  // --- �ema ---
  db.prepare(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      barcode TEXT UNIQUE,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      stock REAL DEFAULT 0,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      total REAL NOT NULL,
      payment TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      saleId TEXT NOT NULL,
      productId TEXT,
      name TEXT NOT NULL,
      qty REAL NOT NULL,
      unitPrice REAL NOT NULL,
      total REAL NOT NULL,
      FOREIGN KEY (saleId) REFERENCES sales(id) ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id)
    )
  `).run();

  return db;
}
