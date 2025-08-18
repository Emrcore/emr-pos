import { fmt } from "./money.js";

export function buildReceipt(cart, paymentType, settings){
  const { subtotal, vat_total, total } = cart.totals();
  const lines = cart.items.map(i => ({
    name: i.name,
    qty: i.qty,
    unit: fmt(i.price),
    total: fmt(i.price * i.qty),
  }));
  return {
    header: {
      title: (settings?.company?.name) || "EMR POS",
      date: new Date().toLocaleString("tr-TR"),
    },
    items: lines,
    summary: {
      subtotal: fmt(subtotal),
      vat: fmt(vat_total),
      total: fmt(total),
      payment: paymentType,
    },
    footer: "Teþekkür ederiz"
  };
}
