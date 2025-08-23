// apps/desktop/shared-db/db.js  (ESM)
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

/**
 * appDataDir: Electron'dan gelen app.getPath('userData')
 * Örn: C:\Users\...\AppData\Roaming\EMR POS
 */
export function openDb(appDataDir) {
  // Uygulamanýn yazacaðý dizin: %APPDATA%/EMR POS/data
  const dataDir = path.join(appDataDir, "data");
  // Klasörleri *önce* oluþtur
  fs.mkdirSync(dataDir, { recursive: true });

  // DB yolu
  const dbPath = path.join(dataDir, "emr-pos.sqlite");

  // Ýstersen logla (sorun olursa path'i görürüz)
  // console.log("[DB] Using file:", dbPath);

  // Dosya yoksa otomatik oluþturur; klasör oluþtuðu için sorun çýkmaz
  const db = new Database(dbPath, { timeout: 5000 });

  // Saðlamlýk ayarlarý
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  return db;
}
