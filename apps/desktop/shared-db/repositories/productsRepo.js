import { v4 as uuid } from "uuid";

export function list(db) {
  return db.prepare("SELECT * FROM products ORDER BY name").all();
}

export function findByBarcode(db, barcode) {
  const stmt = db.prepare("SELECT * FROM products WHERE barcode = ?");
  return stmt.get(barcode);
}

export function insert(db, p) {
  const stmt = db.prepare(`
    INSERT INTO products (id, name, price, barcode, vat_rate, stock, updated_at)
    VALUES (@id, @name, @price, @barcode, @vat_rate, @stock, @updated_at)
  `);
  const row = {
    id: p.id || uuid(),
    name: p.name,
    price: Number(p.price),
    barcode: p.barcode || null,
    vat_rate: p.vat_rate ?? 0.20,
    stock: p.stock ?? 0,
    updated_at: Date.now(),
  };
  stmt.run(row);
  return row;
}

export function updateStock(db, productId, deltaQty) {
  const get = db.prepare("SELECT stock FROM products WHERE id = ?");
  const cur = get.get(productId);
  const newStock = (cur?.stock ?? 0) + deltaQty;
  db.prepare("UPDATE products SET stock = ?, updated_at = ? WHERE id = ?")
    .run(newStock, Date.now(), productId);
}
