// shared-db/repositories/reportsRepo.js  (ESM)
function toYMD(d) {
  if (!d) return null;
  // gelen string ise ilk 10 karakteri (YYYY-MM-DD) býrak
  if (typeof d === "string") return d.slice(0, 10);
  // Date objesi ise ISO’dan tarih kýsmýný al
  return new Date(d).toISOString().slice(0, 10);
}

/**
 * start / end: 'YYYY-MM-DD' (dahil)
 * db: better-sqlite3 instance
 */
export function getSummary(db, start, end) {
  // default: bugün
  const today = new Date();
  const s = toYMD(start) || toYMD(today);
  const e = toYMD(end)   || toYMD(today);

  // Toplam satýþ adedi ve ciro
  const totals = db.prepare(`
    SELECT
      COUNT(*)            AS saleCount,
      COALESCE(SUM(total), 0) AS totalRevenue
    FROM sales
    WHERE DATE(createdAt) BETWEEN DATE(@start) AND DATE(@end)
  `).get({ start: s, end: e });

  // Günlük kýrýlým
  const byDay = db.prepare(`
    SELECT
      DATE(createdAt) AS day,
      COALESCE(SUM(total), 0) AS total
    FROM sales
    WHERE DATE(createdAt) BETWEEN DATE(@start) AND DATE(@end)
    GROUP BY DATE(createdAt)
    ORDER BY DATE(createdAt)
  `).all({ start: s, end: e });

  // Ödeme tipine göre (varsa)
  const byPayment = db.prepare(`
    SELECT
      COALESCE(payment, 'N/A') AS payment,
      COUNT(*) AS count,
      COALESCE(SUM(total), 0) AS total
    FROM sales
    WHERE DATE(createdAt) BETWEEN DATE(@start) AND DATE(@end)
    GROUP BY COALESCE(payment, 'N/A')
    ORDER BY total DESC
  `).all({ start: s, end: e });

  // En çok satan ürünler (sale_items toplamlarýna göre)
  const topProducts = db.prepare(`
    SELECT
      si.productId,
      si.name,
      SUM(si.qty)        AS qty,
      SUM(si.total)      AS total
    FROM sale_items si
    JOIN sales s ON s.id = si.saleId
    WHERE DATE(s.createdAt) BETWEEN DATE(@start) AND DATE(@end)
    GROUP BY si.productId, si.name
    ORDER BY total DESC
    LIMIT 20
  `).all({ start: s, end: e });

  return {
    range: { start: s, end: e },
    totals,
    byDay,
    byPayment,
    topProducts
  };
}

export default { getSummary };
