// apps/desktop/shared-db/index.cjs
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const Database = require("better-sqlite3");

function safeMkdir(p) {
  fs.mkdirSync(p, { recursive: true });
  // yazılabilir mi test et
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

/**
 * baseDir = app.getPath('userData') gönderin.
 */
function openDb(baseDir) {
  const tried = [];

  const candidates = [];
  if (process.env.EMR_POS_DATA_DIR) candidates.push(process.env.EMR_POS_DATA_DIR); // override
  candidates.push(baseDir);
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, "EMR POS"));
  }
  candidates.push(path.join(os.tmpdir(), "emr-pos"));

  let chosenBase = null;
  let lastErr = null;

  for (const cand of candidates) {
    try {
      safeMkdir(cand);
      chosenBase = cand;
      break;
    } catch (e) {
      tried.push(`${cand} -> ${e.message}`);
      lastErr = e;
    }
  }

  if (!chosenBase) {
    throw new Error("Veri dizini oluşturulamadı:\n" + tried.join("\n"));
  }

  const dataDir = path.join(chosenBase, "data");
  safeMkdir(dataDir);

  // *** ÖNEMLİ: Dosya adını ekle! ***
  const dbFile = extendLongPathWin(path.join(dataDir, "emr-pos.sqlite"));

  // logla
  console.log("[emr-pos] DB dir:", dataDir);
  console.log("[emr-pos] DB file:", dbFile);

  // dosyayı dokundur (varsa no-op)
  try {
    const fd = fs.openSync(dbFile, "a");
    fs.closeSync(fd);
  } catch (e) {
    throw new Error("DB dosyası oluşturulamadı: " + dbFile + " / " + e.message);
  }

  const db = new Database(dbFile);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");

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

module.exports = { openDb };
