// CommonJS wrapper for better-sqlite3 (Electron main process friendly)
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

/**
 * Resolve DB file path.
 * - If running inside Electron main, place it under app.getPath('userData').
 * - Otherwise fall back to project root.
 */
function resolveDbPath(filename = 'emr-pos.sqlite') {
  try {
    // late-require to avoid optional electron dependency when unit testing
    const { app } = require('electron');
    const base = app.getPath('userData'); // e.g. C:\Users\<you>\AppData\Roaming\EMR POS
    return path.join(base, filename);
  } catch {
    // non-electron context (tests/scripts)
    return path.join(process.cwd(), filename);
  }
}

/**
 * Open a DB with sane defaults for desktop apps.
 * @param {string} filePath - absolute or relative path; if falsy uses resolveDbPath()
 * @param {object} options - passed to better-sqlite3 (readonly, fileMustExist, timeout, etc.)
 */
function openDb(filePath, options = {}) {
  const dbFile = filePath ? path.resolve(filePath) : resolveDbPath();
  // ensure dir exists
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });

  const db = new Database(dbFile, {
    // default busy timeout to 5s unless overridden
    timeout: 5000,
    ...options,
  });

  // sensible pragmas
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  return db;
}

/**
 * Tiny helper API around prepared statements (optional sugar).
 */
function helpers(db) {
  return {
    exec(sql) {
      return db.exec(sql);
    },
    run(sql, params = {}) {
      return db.prepare(sql).run(params);
    },
    get(sql, params = {}) {
      return db.prepare(sql).get(params);
    },
    all(sql, params = {}) {
      return db.prepare(sql).all(params);
    },
    transaction(fn) {
      return db.transaction(fn);
    },
    close() {
      db.close();
    },
  };
}

module.exports = {
  Database,        // raw constructor if you want full control
  openDb,          // opinionated opener with pragmas
  resolveDbPath,   // where the DB file lives
  helpers,         // small sugar layer
};
