// shared-db/db.js  (ESM)
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

export function openDb(baseDir) {
  if (!baseDir) throw new Error("openDb: baseDir is required");

  // klasörü oluþtur
  fs.mkdirSync(baseDir, { recursive: true });

  // veritabaný dosyasý
  const dbPath = path.join(baseDir, "emr-pos.sqlite");

  // DB'i aç
  const db = new Database(dbPath, { fileMustExist: false });

  // temel PRAGMA'lar
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");

  // tablo yoksa þemayý kur (örnek, kendi tablolarýnýza göre geniþletin)
  ensureSchema(db);

  return db;
}

function ensureSchema(db) {
  // products tablosu örnek kontrolü
  const row = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='products';"
  ).get();
  if (!row) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS products(
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        barcode TEXT UNIQUE,
        price REAL NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS sales(
        id TEXT PRIMARY KEY,
        created_at TEXT DEFAULT (datetime('now')),
        total REAL NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS sale_items(
        id TEXT PRIMARY KEY,
        sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
        product_id TEXT REFERENCES products(id),
        name TEXT NOT NULL,
        qty REAL NOT NULL,
        unit_price REAL NOT NULL,
        total REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings(
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  }
}
