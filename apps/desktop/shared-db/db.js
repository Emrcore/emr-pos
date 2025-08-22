// ESM
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import Database from "better-sqlite3";

function safeMkdir(p) {
  fs.mkdirSync(p, { recursive: true });
  // yaz�labilir mi?
  const t = path.join(p, ".__writecheck");
  fs.writeFileSync(t, "ok");
  fs.unlinkSync(t);
}

function extendLongPathWin(p) {
  // Windows uzun yol deste�i (ihtiya� olursa)
  if (process.platform === "win32" && !p.startsWith("\\\\?\\")) {
    if (p.length >= 240) return "\\\\?\\" + p;
  }
  return p;
}

/**
 * baseDir = app.getPath('userData') g�nderin.
 * Bu fonksiyon data klas�r�n� olu�turur, yaz�labilirli�i test eder,
 * gerekirse LOCALAPPDATA/EMR POS gibi yedek bir k�ke d��er.
 */
export function openDb(baseDir) {
  const candidates = [];

  // 1) �stemci override etmek isterse
  if (process.env.EMR_POS_DATA_DIR) {
    candidates.push(process.env.EMR_POS_DATA_DIR);
  }

  // 2) Normal yol
  candidates.push(baseDir);

  // 3) Yedek (Windows)
  if (process.platform === "win32" && process.env.LOCALAPPDATA) {
    candidates.push(path.join(process.env.LOCALAPPDATA, "EMR POS"));
  }

  // 4) Son �are: kullan�c� temp
  candidates.push(path.join(os.tmpdir(), "emr-pos"));

  let chosenBase = null;
  let lastErr = null;

  for (const cand of candidates) {
    try {
      safeMkdir(cand);
      chosenBase = cand;
      break;
    } catch (e) {
      lastErr = e;
    }
  }

  if (!chosenBase) {
    throw new Error(
      "Veri dizini olu�turulamad�. Son hata: " + (lastErr?.message || lastErr)
    );
  }

  const dataDir = path.join(chosenBase, "data");
  safeMkdir(dataDir);

  const dbPath = extendLongPathWin(path.join(dataDir, "emr-pos.sqlite"));

  // DB dosyas�n� �nceden dokundur (baz� antivir�sler/permission durumlar� i�in)
  try {
    const fd = fs.openSync(dbPath, "a");
    fs.closeSync(fd);
  } catch (e) {
    // dokunma ba�ar�s�zsa devam etmek yerine net hata verelim
    throw new Error("DB dosyas� olu�turulamad�: " + dbPath + " / " + e.message);
  }

  const db = new Database(dbPath);
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

export default { openDb };
