import React, { useEffect, useState } from "react";

export default function Settings(){
  const [company, setCompany] = useState({ name:"", tax_no:"" });
  const [printers, setPrinters] = useState([]);

  useEffect(()=>{ (async()=>{
    const c = await window.electronAPI.getSetting("company");
    if (c) setCompany(c);
  })(); }, []);

  async function save(){
    await window.electronAPI.setSetting("company", company);
    alert("Kaydedildi");
  }

  async function loadPrinters(){
    const list = await window.electronAPI.getPrinters();
    setPrinters(list || []);
  }

  async function printTest(){
    await window.electronAPI.printReceipt({
      header: { title: company?.name || "EMR POS", date: new Date().toLocaleString("tr-TR") },
      items: [{ name:"Test Ürün", qty:1, unit:"10.00 ₺", total:"10.00 ₺" }],
      summary: { subtotal:"10.00 ₺", vat:"2.00 ₺", total:"12.00 ₺", payment:"test" },
      footer: "Test baskı"
    });
  }

  return (
    <div className="card" style={{flex:1}}>
      <h3>Ayarlar</h3>
      <div className="col" style={{maxWidth:420}}>
        <input className="input" placeholder="Firma Adı" value={company.name} onChange={e=>setCompany(c=>({...c, name:e.target.value}))} />
        <input className="input" placeholder="Vergi No" value={company.tax_no||""} onChange={e=>setCompany(c=>({...c, tax_no:e.target.value}))} />
        <div className="row">
          <button className="button" onClick={save}>Kaydet</button>
          <button className="button secondary" onClick={loadPrinters}>Yazıcıları Listele</button>
          <button className="button" onClick={printTest}>Test Baskı</button>
        </div>
        <ul>
          {printers.map(p=> <li key={p.name}>{p.name} {p.description ? `(${p.description})` : ""}</li>)}
        </ul>
      </div>
    </div>
  );
}
