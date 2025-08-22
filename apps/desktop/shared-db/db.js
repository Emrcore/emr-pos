// apps/desktop/shared-db/db.js
import fs from "fs";
import path from "path";
import os from "os";
import Database from "better-sqlite3";

/**
 * rootDir: Electron main'den app.getPath("userData") gelecek.
 */
export function openDb(rootDir) {
  // rootDir gelmezse ev dizinine düþ
  const baseDir = rootDir || path.join(os.homedir(), ".emr-pos");
  const dataDir = path.join(baseDir, "data");

  try {
    // Klasörleri garanti et
    fs.mkdirSync(dataDir, { recursive: true });

    const dbPath = path.join(dataDir, "emr-pos.sqlite3");

    // Ek teþhis: yol eriþilebilir mi?
    try {
      fs.accessSync(dataDir, fs.constants.R_OK | fs.constants.W_OK);
    } catch (e) {
      throw new Error(
        `Veri klasörüne eriþilemiyor: ${dataDir}\n` +
        `Ýzin/Hata: ${e?.message || e}`
      );
    }

    // DB'yi oluþtur/aç
    const db = new Database(dbPath, {
      fileMustExist: false,
      timeout: 5000,
    });

    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");

    return db;
  } catch (err) {
    // Burada ayrýntýlý mesaj verelim
    const msg =
      `SQLite açýlýþ hatasý: ${err?.message || err}\n` +
      `baseDir: ${baseDir}\n` +
      `dataDir: ${dataDir}\n`;
    // Üst katmana fýrlat
    throw new Error(msg);
  }
}

export default { openDb };
