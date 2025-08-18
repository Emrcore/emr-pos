import { useState } from "react";
import axios from "../api/axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { Calendar, BarChart2, FileText, User } from "lucide-react";

export default function ReportAdvanced() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [summary, setSummary] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    if (!startDate || !endDate) return alert("Tarih aralığı seçin");
    setLoading(true);
    try {
      const res = await axios.post("/reports-advanced", { startDate, endDate });
      setSummary(res.data.summary);
      setData(res.data.data);
    } catch (err) {
      console.error("Rapor hatası:", err);
      alert("Rapor alınamadı");
    }
    setLoading(false);
  };

  const exportExcel = () => {
    const rows = data.map((s) => ({
      Fatura: s.invoice_number,
      Tutar: s.total,
      "Ödeme Türü": s.payment_type,
      Tarih: new Date(s.created_at).toLocaleString("tr-TR"),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rapor");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "rapor.xlsx");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <BarChart2 className="w-6 h-6" /> Gelişmiş Rapor
      </h1>

      {/* Tarih seçimi */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <button
          onClick={fetchReport}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          📊 Rapor Al
        </button>
        {data.length > 0 && (
          <button
            onClick={exportExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            📁 Excel
          </button>
        )}
      </div>

      {/* Özet */}
      {summary && (
        <div className="bg-gray-100 p-4 rounded mb-4 grid grid-cols-2 gap-4">
          <div className="text-lg font-semibold flex items-center gap-2">
            💰 Toplam Ciro: <span className="text-green-700">{summary.total_amount.toFixed(2)} ₺</span>
          </div>
          <div className="text-lg font-semibold flex items-center gap-2">
            🧾 Satış Sayısı: <span>{summary.total_sales} adet</span>
          </div>
        </div>
      )}

      {/* Grafik */}
      {data.length > 0 && (
        <div className="h-64 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="invoice_number" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Liste */}
      {data.map((s) => (
        <div key={s.id} className="border-b py-2 text-sm">
          <div className="flex justify-between">
            <span>
              <strong>Fatura:</strong> #{s.invoice_number}
            </span>
            <span>
              <strong>Tutar:</strong> {s.total} ₺
            </span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>{new Date(s.created_at).toLocaleString("tr-TR")}</span>
            <span>{s.payment_type.toUpperCase()}</span>
          </div>
        </div>
      ))}

      {loading && <p className="text-center mt-4">Yükleniyor...</p>}
    </div>
  );
}
