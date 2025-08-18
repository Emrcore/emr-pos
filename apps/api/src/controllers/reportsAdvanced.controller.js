import { db } from "../db/index.js";

export const getAdvancedReport = async (req, res) => {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Tarih aralýðý zorunludur" });
  }

  try {
    const salesRes = await db.query(
      `SELECT 
        s.id, s.invoice_number, s.total, s.payment_type, s.created_at,
        json_agg(si.*) AS items
       FROM sales s
       LEFT JOIN sale_items si ON si.sale_id = s.id
       WHERE s.created_at BETWEEN $1 AND $2
       GROUP BY s.id
       ORDER BY s.created_at DESC`,
      [startDate + " 00:00:00", endDate + " 23:59:59"]
    );

    const summary = {
      total_sales: salesRes.rows.length,
      total_amount: salesRes.rows.reduce((sum, s) => sum + parseFloat(s.total), 0),
    };

    res.json({ summary, data: salesRes.rows });
  } catch (err) {
    console.error("[Geliþmiþ Rapor Hatasý]:", err.message);
    res.status(500).json({ error: "Rapor alýnamadý" });
  }
};
