// shared-db/db.js  (ESM)
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function loadBetterSqlite3() {
  // 1) Normal ��z�mleme (dev ortam�nda veya asar i�inden �a�r�l�yorsa �al���r)
  try {
    return require("better-sqlite3");
  } catch {}

  // 2) Prod: shared-db asar DI�INDAYKEN, as�l node_modules asar ���NDE
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
    `better-sqlite3 bulunamad�. Denenen yollar: ${candidates.join(" , ")}`
  );
}

const Database = loadBetterSqlite3();

// ��� a�a��da sizin mevcut openDb ve di�er kodlar�n�z aynen devam etsin ���
export function openDb(baseDir) {
  // ... mevcut openDb i�eri�iniz ...
}
export default { openDb };
