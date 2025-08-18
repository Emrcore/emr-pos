import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import SalesScreen from "./components/SalesScreen.jsx";
import ProductForm from "./components/ProductForm.jsx";
import Reports from "./components/Reports.jsx";
import Settings from "./components/Settings.jsx";

function App() {
  const [tab, setTab] = useState("sales");

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">EMR POS</div>
        <nav className="tabs">
          <button className={tab==="sales"?"active":""} onClick={()=>setTab("sales")}>Satış</button>
          <button className={tab==="products"?"active":""} onClick={()=>setTab("products")}>Ürünler</button>
          <button className={tab==="reports"?"active":""} onClick={()=>setTab("reports")}>Raporlar</button>
          <button className={tab==="settings"?"active":""} onClick={()=>setTab("settings")}>Ayarlar</button>
        </nav>
      </header>
      <main className="content">
        {tab==="sales" && <SalesScreen />}
        {tab==="products" && <ProductForm />}
        {tab==="reports" && <Reports />}
        {tab==="settings" && <Settings />}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
