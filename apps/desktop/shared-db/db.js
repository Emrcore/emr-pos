// shared-db/db.js  (ESM)
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function loadBetterSqlite3() {
  // 1) Normal çözümleme (dev ortamýnda veya asar içinden çaðrýlýyorsa çalýþýr)
  try {
    return require("better-sqlite3");
  } catch {}

  // 2) Prod: shared-db asar DIÞINDAYKEN, asýl node_modules asar ÝÇÝNDE
  const candidates = [
    path.join(process.resourcesPath, "app.asar", "node_modules", "better-sqlite3"),
    path.join(process.resourcesPath, "app.asar.unpacked", "node_modules", "better-sqlite3"),
  ];
  for (const p of candidates) {
    try {
      return require(p);
    } catch {}
  }

  throw new Error(
    `better-sqlite3 bulunamadý. Denenen yollar: ${candidates.join(" , ")}`
  );
}

const Database = loadBetterSqlite3();

// ——— aþaðýda sizin mevcut openDb ve diðer kodlarýnýz aynen devam etsin ———
export function openDb(baseDir) {
  // ... mevcut openDb içeriðiniz ...
}
export default { openDb };
