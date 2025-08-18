import { db } from "../db/index.js";

// ?? �r�n Ekle
export const createProduct = async (req, res) => {
  const { name, price, vat = 0, barcode, image_url = null } = req.body;

  if (!name || isNaN(price)) {
    return res.status(400).json({ error: "Ge�ersiz �r�n verisi" });
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
    console.error("[�r�n Ekleme Hatas�]:", err.message);
    return res.status(500).json({ error: "�r�n eklenemedi" });
  }
};

// ?? �r�nleri Listele
export const getAllProducts = async (req, res) => {
  try {
    const result = await db.query(`SELECT * FROM products ORDER BY created_at DESC`);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("[�r�n Listeleme Hatas�]:", err.message);
    return res.status(500).json({ error: "�r�nler al�namad�" });
  }
};

// ?? �r�n G�ncelle
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
      return res.status(404).json({ error: "�r�n bulunamad�" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("[�r�n G�ncelleme Hatas�]:", err.message);
    return res.status(500).json({ error: "�r�n g�ncellenemedi" });
  }
};

// ?? �r�n Sil
export const deleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(`DELETE FROM products WHERE id = $1`, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "�r�n bulunamad�" });
    }

    return res.status(200).json({ message: "�r�n silindi" });
  } catch (err) {
    console.error("[�r�n Silme Hatas�]:", err.message);
    return res.status(500).json({ error: "�r�n silinemedi" });
  }
};
