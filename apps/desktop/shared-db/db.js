const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
function getUserDataDir() {
  try { const { app } = require("electron"); if (app && app.getPath) return app.getPath("userData"); } catch(_) {}
  return path.join(process.cwd(), ".emr-pos");
}
function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); }
function openDb(baseDir) {
  const root = baseDir || getUserDataDir();
  ensureDir(root);
  const dbPath = path.join(root, "emr-pos.sqlite3");
  console.log("[EMR POS] DB path:", dbPath);
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  return db;
}
module.exports = { openDb };
