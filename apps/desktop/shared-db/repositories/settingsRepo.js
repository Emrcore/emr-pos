export function get(db, key) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  try { return row ? JSON.parse(row.value) : null; } catch { return row?.value ?? null; }
}

export function set(db, key, value) {
  const str = typeof value === "string" ? value : JSON.stringify(value);
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value
  `).run(key, str);
  return true;
}
