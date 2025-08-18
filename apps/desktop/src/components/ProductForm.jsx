import React, { useEffect, useState } from "react";

export default function ProductForm() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ name:"", price:"", barcode:"", vat_rate:0.20, stock:0 });

  async function refresh(){
    const rows = await window.electronAPI.listProducts();
    setList(rows);
  }
  useEffect(()=>{ refresh(); }, []);

  async function save(e){
    e.preventDefault();
    if(!form.name || !form.price) return alert("İsim ve fiyat zorunlu");
    await window.electronAPI.insertProduct({ ...form, price: Number(form.price), stock: Number(form.stock) });
    setForm({ name:"", price:"", barcode:"", vat_rate:0.20, stock:0 });
    refresh();
  }

  return (
    <div className="card" style={{flex:1}}>
      <h3>Ürün Ekle</h3>
      <form onSubmit={save} className="col">
        <input className="input" placeholder="Ürün adı" value={form.name} onChange={e=>setForm(f=>({...f, name:e.target.value}))} />
        <div className="row">
          <input className="input" style={{flex:1}} placeholder="Fiyat" value={form.price} onChange={e=>setForm(f=>({...f, price:e.target.value}))} />
          <input className="input" style={{flex:1}} placeholder="Barkod" value={form.barcode} onChange={e=>setForm(f=>({...f, barcode:e.target.value}))} />
        </div>
        <div className="row">
          <input className="input" style={{flex:1}} placeholder="KDV (0.20)" value={form.vat_rate} onChange={e=>setForm(f=>({...f, vat_rate: Number(e.target.value)}))} />
          <input className="input" style={{flex:1}} placeholder="Stok" value={form.stock} onChange={e=>setForm(f=>({...f, stock: Number(e.target.value)}))} />
        </div>
        <div className="row">
          <button className="button" type="submit">Kaydet</button>
        </div>
      </form>

      <h3 style={{marginTop:16}}>Ürünler</h3>
      <table className="table">
        <thead><tr><th>Ad</th><th>Barkod</th><th>Fiyat</th><th>Stok</th></tr></thead>
        <tbody>
          {list.map(p=>(
            <tr key={p.id}><td>{p.name}</td><td>{p.barcode||"-"}</td><td>{p.price}</td><td>{p.stock}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
