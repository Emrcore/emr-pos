export function buildReceipt(cart, paymentType, settings){
  const lines = cart.items.map(i => ({
    name: i.name,
    qty: i.qty,
    unit: i.price.toFixed(2),
    total: (i.qty * i.price).toFixed(2),
  }));
  return {
    header: {
      title: settings?.company_name || "EMR POS",
      date: new Date().toLocaleString(),
    },
    items: lines,
    summary: {
      subtotal: cart.subtotal.toFixed(2),
      vat: cart.vatTotal.toFixed(2),
      total: cart.total.toFixed(2),
      payment: paymentType,
    },
    footer: "Teþekkür ederiz",
  };
}
