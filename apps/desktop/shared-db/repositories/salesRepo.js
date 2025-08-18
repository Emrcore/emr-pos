import { v4 as uuid } from "uuid";
import { updateStock } from "./productsRepo.js";

export function create(db, payload) {
  // payload: { payment_type, items:[{product_id, name, qty, unit_price, vat_rate}], totals:{subtotal, vat_total, total, discount} }
  const saleId = uuid();
  const now = Date.now();

  const tx = db.transaction((p) => {
    db.prepare(`
      INSERT INTO sales (id, date, subtotal, vat_total, discount, total, payment_type, synced)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      saleId,
      now,
      p.totals.subtotal,
      p.totals.vat_total,
      p.totals.discount || 0,
      p.totals.total,
      p.payment_type
    );

    const insertItem = db.prepare(`
      INSERT INTO sale_items (id, sale_id, product_id, qty, unit_price, vat_rate, line_total)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const it of p.items) {
      const itemId = uuid();
      const lineTotal = Number((it.qty * it.unit_price).toFixed(2));
      insertItem.run(itemId, saleId, it.product_id, it.qty, it.unit_price, it.vat_rate, lineTotal);
      // stok düþ
      updateStock(db, it.product_id, -it.qty);
    }
  });

  tx(payload);
  return { id: saleId, date: now };
}
