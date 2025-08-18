// apps/desktop/shared-db/schema.js
export function createSchema(db) {
  db.exec(`
    PRAGMA journal_mode=WAL;

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      barcode TEXT UNIQUE,
      vat_rate REAL DEFAULT 0.20,
      stock REAL DEFAULT 0,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      date INTEGER NOT NULL,
      subtotal REAL NOT NULL,
      vat_total REAL NOT NULL,
      discount REAL DEFAULT 0,
      total REAL NOT NULL,
      payment_type TEXT CHECK(payment_type IN ('cash','card','mixed')) NOT NULL,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      qty REAL NOT NULL,
      unit_price REAL NOT NULL,
      vat_rate REAL NOT NULL,
      line_total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_outbox (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,      -- 'product','sale', ...
      payload TEXT NOT NULL,
      created_at INTEGER
    );
  `);
}
