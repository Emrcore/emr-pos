export function getSummary(db, start, end) {
  const from = new Date(start).getTime();
  const to = new Date(end).getTime();
  const sales = db.prepare("SELECT * FROM sales WHERE date BETWEEN ? AND ?").all(from, to);

  const sum = (arr, sel) => arr.reduce((a, s) => a + Number(s[sel] || 0), 0);
  const total = sum(sales, "total");
  const vat_total = sum(sales, "vat_total");
  const subtotal = sum(sales, "subtotal");

  const byPay = {};
  for (const s of sales) byPay[s.payment_type] = (byPay[s.payment_type] || 0) + Number(s.total);

  return { count: sales.length, subtotal, vat_total, total, byPay };
}
