// apps/desktop/shared-db/db.js  (ESM)
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

/**
 * appDataDir: Electron'dan gelen app.getPath('userData')
 * �rn: C:\Users\...\AppData\Roaming\EMR POS
 */
export function openDb(appDataDir) {
  // Uygulaman�n yazaca�� dizin: %APPDATA%/EMR POS/data
  const dataDir = path.join(appDataDir, "data");
  // Klas�rleri *�nce* olu�tur
  fs.mkdirSync(dataDir, { recursive: true });

  // DB yolu
  const dbPath = path.join(dataDir, "emr-pos.sqlite");

  // �stersen logla (sorun olursa path'i g�r�r�z)
  // console.log("[DB] Using file:", dbPath);

  // Dosya yoksa otomatik olu�turur; klas�r olu�tu�u i�in sorun ��kmaz
  const db = new Database(dbPath, { timeout: 5000 });

  // Sa�laml�k ayarlar�
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  return db;
}
