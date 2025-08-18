import React, { useCallback, useEffect, useMemo, useState } from "react";
import useBarcodeInput from "../hooks/useBarcodeInput.js";
import { useCart } from "../store/cartStore.js";
import { buildReceipt } from "../utils/receiptBuilder.js";
import QuickCreateProductModal from "./QuickCreateProductModal.jsx";
import { fmt } from "../utils/money.js";

export default function SalesScreen(){
  const cart = useCart();
  const [modal, setModal] = useState(null); // { barcode }
  const [settings, setSettings] = useState(null);

  useEffect(()=>{ (async()=>{
    const company = await window.electronAPI.getSetting("company");
    setSettings({ company });
  })(); }, []);

  const handleBarcode = useCallback(async (code) => {
    const p = await window.electronAPI.findProductByBarcode(code);
    if (!p) return setModal({ barcode: code });
    cart.addProduct(p);
  }, [cart]);

  useBarcodeInput(handleBarcode);

  const totals = cart.totals();
  const onCreated = (row) => cart.addProduct(row);

  async function completeSale(payment_type){
    if (cart.items.length === 0) return alert("Sepet boş");
    // DB'ye satış kaydı
    const payload = {
      payment_type,
      items: cart.items.map(i => ({
        product_id: i.product_id, name: i.name, qty: i.qty, unit_price: i.price, vat_rate: i.vat_rate
      })),
      totals
    };
    await window.electronAPI.createSale(payload);

    // Yazdır
    const receipt = buildReceipt({ items: cart.items, totals: ()=>totals }, payment_type, settings);
    await window.electronAPI.printReceipt(receipt);

    cart.clear();
    alert("Satış tamamlandı");
  }

  return (
    <>
      <div className="card" style={{flex:1}}>
        <h3>Sepet</h3>
        <table className="table">
          <thead><tr><th>Ürün</th><th>Adet</th><th>Birim</th><th>Toplam</th><th></th></tr></thead>
          <tbody>
            {cart.items.map(i=>(
              <tr key={i.product_id}>
                <td>{i.name}</td>
                <td className="row">
                  <button className="button secondary" onClick={()=>cart.decrement(i.product_id)}>-</button>
                  <span>{i.qty}</span>
                  <button className="button secondary" onClick={()=>cart.increment(i.product_id)}>+</button>
                </td>
                <td>{fmt(i.price)}</td>
                <td>{fmt(i.price * i.qty)}</td>
                <td><button className="button secondary" onClick={()=>cart.remove(i.product_id)}>Sil</button></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="row" style={{justifyContent:"flex-end", gap:24}}>
          <div className="col" style={{minWidth:240}}>
            <div className="row"><b>Ara Toplam:</b><span>{fmt(totals.subtotal)}</span></div>
            <div className="row"><b>KDV:</b><span>{fmt(totals.vat_total)}</span></div>
            <div className="row"><b>TOPLAM:</b><span>{fmt(totals.total)}</span></div>
          </div>
          <div className="col" style={{minWidth:240}}>
            <button className="button" onClick={()=>completeSale("cash")}>Nakit</button>
            <button className="button" onClick={()=>completeSale("card")}>Kart</button>
          </div>
        </div>
      </div>

      {modal && (
        <QuickCreateProductModal
          barcode={modal.barcode}
          onClose={()=>setModal(null)}
          onCreated={onCreated}
        />
      )}
    </>
  );
}
