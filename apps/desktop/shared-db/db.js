// shared-db/db.js  (ESM)
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

/** better-sqlite3'ü hem dev'de hem prod'da bulabilmek için */
function loadBetterSqlite3() {
  try {
    return require("better-sqlite3"); // normal çözüm
  } catch {}

  // Prod: shared-db extraResources ile kopyalanmýþsa, asýl node_modules app.asar içinde
  const tries = [
    path.join(process.resourcesPath || "", "app.asar", "node_modules", "better-sqlite3"),
    path.join(process.resourcesPath || "", "app.asar.unpacked", "node_modules", "better-sqlite3"),
  ].filter(Boolean);

  for (const p of tries) {
    try { return require(p); } catch {}
  }

  throw new Error("better-sqlite3 bulunamadý (dev ve app.asar içi yollar denendi).");
}

const Database = loadBetterSqlite3();

/* yardýmcýlar */
function safeMkdir(p) {
  fs.mkdirSync(p, { recursive: true });
  const t = path.join(p, ".__writecheck");
  fs.writeFileSync(t, "ok");
  fs.unlinkSync(t);
}
function extendLongPathWin(p) {
  if (process.platform === "win32" && !p.startsWith("\\\\?\\")) {
    if (p.length >= 240) return "\\\\?\\" + p;
  }
  return p;
}

function hasColumn(db, table, col) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some(r => r.name === col);
}
function ensureColumn(db, table, col, sqlTypeAndDefault) {
  if (!hasColumn(db, table, col)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${sqlTypeAndDefault}`).run();
  }
}

/** ilk kurulum + güvenli migrasyonlar */
function migrate(db) {
  // PRODUCTS: tam þema ile yarat
  db.prepare(`
    CREATE TABLE IF NOT EXISTS products (
      id        TEXT PRIMARY KEY,
      barcode   TEXT UNIQUE,
      name      TEXT NOT NULL,
      price     REAL NOT NULL,
      stock     REAL DEFAULT 0,
      vat_rate  REAL DEFAULT 0.20,
      updated_at INTEGER,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `).run();

  // Eksikler için migrasyon (eski kurulumlar)
  ensureColumn(db, "products", "vat_rate",  "REAL DEFAULT 0.20");
  ensureColumn(db, "products", "updated_at","INTEGER");

  // SETTINGS
  db.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `).run();

  // SALES
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sales (
      id        TEXT PRIMARY KEY,
      total     REAL NOT NULL,
      payment   TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `).run();

  // SALE ITEMS
  db.prepare(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id         TEXT PRIMARY KEY,
      saleId     TEXT NOT NULL,
      productId  TEXT,
      name       TEXT NOT NULL,
      qty        REAL NOT NULL,
      unitPrice  REAL NOT NULL,
      total      REAL NOT NULL,
      FOREIGN KEY (saleId)    REFERENCES sales(id)   ON DELETE CASCADE,
      FOREIGN KEY (productId) REFERENCES products(id)
    )
  `).run();
}

/**
 * baseDir = app.getPath('userData') gönderin.
 * Gerekirse LOCALAPPDATA ve temp'e düþer. DB açar ve döndürür.
 */
export function openDb(baseDir) {
  const candidates = [];

  if (process.env.EMR_POS_DATA_DIR) candidates.push(process.env.EMR_POS_DATA_DIR);
  if (baseDir) candidates.push(baseDir);
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, "EMR POS"));
  }
  candidates.push(path.join(os.tmpdir(), "emr-pos"));

  let chosen = null, lastErr = null;
  for (const c of candidates) {
    try { safeMkdir(c); chosen = c; break; }
    catch (e) { lastErr = e; }
  }
  if (!chosen) throw new Error("Veri dizini oluþturulamadý: " + (lastErr?.message || lastErr));

  const dataDir = path.join(chosen, "data");
  safeMkdir(dataDir);

  const dbPath = extendLongPathWin(path.join(dataDir, "emr-pos.sqlite"));
  // dosyayý 'dokun'
  try {
    const fd = fs.openSync(dbPath, "a"); fs.closeSync(fd);
  } catch (e) {
    throw new Error("DB dosyasý oluþturulamadý: " + dbPath + " / " + e.message);
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");

  migrate(db); // <-- kritik

  return db; // DB nesnesi
}

export default { openDb };
