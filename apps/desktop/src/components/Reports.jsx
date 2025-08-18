import React, { useState } from "react";
import { fmt } from "../utils/money.js";

export default function Reports(){
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [data, setData] = useState(null);

  async function fetchReport(){
    if(!start || !end) return alert("Tarih aralığı seçin");
    const res = await window.electronAPI.reportSummary({ start, end });
    setData(res);
  }

  return (
    <div className="card" style={{flex:1}}>
      <h3>Raporlar</h3>
      <div className="row">
        <input className="input" type="date" value={start} onChange={e=>setStart(e.target.value)} />
        <input className="input" type="date" value={end} onChange={e=>setEnd(e.target.value)} />
        <button className="button" onClick={fetchReport}>Getir</button>
      </div>

      {data && (
        <div className="col" style={{marginTop:12}}>
          <div>Satış adedi: <b>{data.count}</b></div>
          <div>Ara Toplam: <b>{fmt(data.subtotal)}</b></div>
          <div>KDV: <b>{fmt(data.vat_total)}</b></div>
          <div>Toplam: <b>{fmt(data.total)}</b></div>
          <div className="col" style={{marginTop:8}}>
            <div><b>Ödeme Türü:</b></div>
            {Object.entries(data.byPay||{}).map(([k,v])=>(
              <div key={k} className="row"><span className="badge">{k}</span><span>{fmt(v)}</span></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
