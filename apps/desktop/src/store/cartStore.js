import { create } from "zustand";

export const useCart = create((set, get) => ({
  items: [], // {product_id, name, price, vat_rate, qty}
  addProduct(p) {
    const items = [...get().items];
    const idx = items.findIndex(x => x.product_id === p.id);
    if (idx >= 0) items[idx].qty += 1;
    else items.push({ product_id: p.id, name: p.name, price: p.price, vat_rate: p.vat_rate ?? 0.20, qty: 1 });
    set({ items });
  },
  increment(id) {
    set({ items: get().items.map(x => x.product_id===id ? {...x, qty:x.qty+1} : x) });
  },
  decrement(id) {
    set({ items: get().items.map(x => x.product_id===id ? {...x, qty:Math.max(1,x.qty-1)} : x) });
  },
  remove(id) {
    set({ items: get().items.filter(x => x.product_id !== id) });
  },
  clear() { set({ items: [] }); },
  totals() {
    const items = get().items;
    const subtotal = items.reduce((a,i)=> a + i.price * i.qty, 0);
    const vat_total = items.reduce((a,i)=> a + (i.price * i.qty * i.vat_rate), 0);
    const total = subtotal + vat_total;
    return { subtotal: round2(subtotal), vat_total: round2(vat_total), total: round2(total), discount: 0 };
  }
}));

function round2(n){ return Math.round(n*100)/100; }
