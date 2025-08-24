// apps/desktop/shared-db/repositories/productsRepo.js
import { v4 as uuidv4 } from "../vendor/uuid.js";

export function list(db) {
  return db.prepare("SELECT * FROM products ORDER BY name").all();
}

export function findByBarcode(db, barcode) {
  return db.prepare("SELECT * FROM products WHERE barcode = ?").get(barcode);
}

export function insert(db, p) {
  const stmt = db.prepare(`
    INSERT INTO products (id, name, price, barcode, vat_rate, stock, updated_at)
    VALUES (@id, @name, @price, @barcode, @vat_rate, @stock, @updated_at)
  `);

  const row = {
    id: p.id || uuidv4(),
    name: String(p.name ?? "").trim(),
    price: Number(p.price ?? 0),
    barcode: p.barcode ? String(p.barcode).trim() : null,
    vat_rate: Number(p.vat_rate ?? 0.20),
    stock: Number(p.stock ?? 0),
    updated_at: Date.now(),
  };

  stmt.run(row);
  return row;
}

export function updateStock(db, productId, deltaQty) {
  const cur = db.prepare("SELECT stock FROM products WHERE id = ?").get(productId);
  const newStock = Number(cur?.stock ?? 0) + Number(deltaQty ?? 0);
  db.prepare("UPDATE products SET stock = ?, updated_at = ? WHERE id = ?")
    .run(newStock, Date.now(), productId);
}

// Default export (main loader'ý için uyumlu)
export default { list, findByBarcode, insert, updateStock };
