import { db } from "../db/index.js";

// ?? Ürün Ekle
export const createProduct = async (req, res) => {
  const { name, price, vat = 0, barcode, image_url = null } = req.body;

  if (!name || isNaN(price)) {
    return res.status(400).json({ error: "Geçersiz ürün verisi" });
  }

  try {
    const result = await db.query(
      `INSERT INTO products (name, price, vat, barcode, image_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name.trim(), price, vat, barcode, image_url]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("[Ürün Ekleme Hatasý]:", err.message);
    return res.status(500).json({ error: "Ürün eklenemedi" });
  }
};

// ?? Ürünleri Listele
export const getAllProducts = async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM products ORDER BY created_at DESC`);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("[Ürün Listeleme Hatasý]:", err.message);
    return res.status(500).json({ error: "Ürünler alýnamadý" });
  }
};

// ?? Ürün Güncelle
export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, price, vat, barcode, image_url = null } = req.body;

  try {
    const result = await db.query(
      `UPDATE products
       SET name = $1, price = $2, vat = $3, barcode = $4, image_url = $5
       WHERE id = $6
       RETURNING *`,
      [name, price, vat, barcode, image_url, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Ürün bulunamadý" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("[Ürün Güncelleme Hatasý]:", err.message);
    return res.status(500).json({ error: "Ürün güncellenemedi" });
  }
};

// ?? Ürün Sil
export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(`DELETE FROM products WHERE id = $1`, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Ürün bulunamadý" });
    }

    return res.status(200).json({ message: "Ürün silindi" });
  } catch (err) {
    console.error("[Ürün Silme Hatasý]:", err.message);
    return res.status(500).json({ error: "Ürün silinemedi" });
  }
};
