import { useState } from "react";
import axios from "../api/axios";
import toast from "react-hot-toast";

export default function ProductAdd() {
  const [form, setForm] = useState({
    name: "",
    price: "",
    vat: "",
    barcode: "",
    image_url: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const generateBarcode = () => {
    const randomBarcode = Math.floor(100000000000 + Math.random() * 900000000000).toString(); // 12 haneli
    setForm((prev) => ({ ...prev, barcode: randomBarcode }));
    toast.success("📦 Otomatik barkod oluşturuldu");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name || !form.price || !form.barcode) {
      toast.error("Ürün adı, fiyat ve barkod zorunludur");
      return;
    }

    setLoading(true);
    try {
      await axios.post("/products", form);
      toast.success("✅ Ürün başarıyla eklendi");
      setForm({ name: "", price: "", vat: "", barcode: "", image_url: "" });
    } catch (err) {
      console.error(err);
      toast.error("❌ Ürün eklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold">➕ Yeni Ürün Ekle</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">📝 Ürün Adı</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">💰 Fiyat (₺)</label>
          <input
            name="price"
            type="number"
            step="0.01"
            value={form.price}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">🧾 KDV (%)</label>
          <input
            name="vat"
            type="number"
            step="0.01"
            value={form.vat}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="Varsayılan: 0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">📦 Barkod</label>
          <div className="flex gap-2">
            <input
              name="barcode"
              value={form.barcode}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded"
              required
            />
            <button
              type="button"
              onClick={generateBarcode}
              className="bg-gray-300 px-3 py-2 rounded hover:bg-gray-400 text-sm"
            >
              🎲 Otomatik
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">🖼️ Ürün Görseli (URL)</label>
          <input
            name="image_url"
            value={form.image_url}
            onChange={handleChange}
            className="w-full border px-3 py-2 rounded"
            placeholder="https://..."
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded w-full"
        >
          {loading ? "Ekleniyor..." : "➕ Ürünü Kaydet"}
        </button>
      </form>
    </div>
  );
}
