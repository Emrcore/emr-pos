import { db } from "../db/index.js";

// ? Satýþ oluþtur
export const createSale = async (req, res) => {
  const { items, total, payment_type, device_id } = req.body;

  if (!items || !Array.isArray(items) || isNaN(total)) {
    return res.status(400).json({ error: "Geçersiz satýþ verisi" });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const saleResult = await client.query(
      `INSERT INTO sales (total, payment_type, device_id)
       VALUES ($1, $2, $3)
       RETURNING id, invoice_number, created_at`,
      [total, payment_type, device_id]
    );

    const sale = saleResult.rows[0];

    for (const item of items) {
      const { product_name, quantity, price, vat } = item;
      await client.query(
        `INSERT INTO sale_items (sale_id, product_name, quantity, price, vat)
         VALUES ($1, $2, $3, $4, $5)`,
        [sale.id, product_name, quantity, price, vat || 0]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({ sale }); // ?? invoice_number burada dönüyor
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[Satýþ Ekleme Hatasý]:", err.message);
    return res.status(500).json({ error: "Satýþ eklenemedi" });
  } finally {
    client.release();
  }
};

// ? Tüm satýþlarý listele (ürünlerle birlikte)
export const getAllSales = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.*, json_agg(si.*) AS items
      FROM sales s
      LEFT JOIN sale_items si ON si.sale_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("[Satýþ Listeleme Hatasý]:", err.message);
    return res.status(500).json({ error: "Satýþlar alýnamadý" });
  }
};

// ? Bugünkü satýþ toplamý
export const getDailySales = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        COALESCE(SUM(total), 0) AS total,
        COUNT(*) AS count
      FROM sales
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("[Günlük Satýþ Hatasý]:", err.message);
    return res.status(500).json({ error: "Günlük satýþ alýnamadý" });
  }
};

// ? Ürün bazlý satýþ özeti
export const getSalesByProduct = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        product_name, 
        SUM(quantity) AS total_quantity, 
        SUM(quantity * price) AS total_revenue
      FROM sale_items
      GROUP BY product_name
      ORDER BY total_revenue DESC
    `);

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("[Ürün Bazlý Satýþ Hatasý]:", err.message);
    return res.status(500).json({ error: "Ürün bazlý satýþ alýnamadý" });
  }
};
