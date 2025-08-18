import React, { useState } from "react";

export default function QuickCreateProductModal({ barcode, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  async function save(){
    if(!name || !price) return alert("Ürün adı ve fiyat zorunlu");
    const row = await window.electronAPI.insertProduct({ name, price: Number(price), barcode, vat_rate: 0.20, stock: 0 });
    onCreated(row);
    onClose();
  }

  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,.3)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50
    }}>
      <div className="card" style={{minWidth:360}}>
        <h3>Hızlı Ürün Oluştur</h3>
        <div className="col">
          <div className="badge">Barkod: {barcode}</div>
          <input className="input" placeholder="Ürün adı" value={name} onChange={e=>setName(e.target.value)} />
          <input className="input" placeholder="Fiyat" value={price} onChange={e=>setPrice(e.target.value)} />
          <div className="row" style={{justifyContent:"flex-end"}}>
            <button className="button secondary" onClick={onClose}>İptal</button>
            <button className="button" onClick={save}>Kaydet</button>
          </div>
        </div>
      </div>
    </div>
  );
}
