import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function Settings() {
  const [deviceId, setDeviceId] = useState("");
  const [printerName, setPrinterName] = useState("");
  const [availablePrinters, setAvailablePrinters] = useState([]);

  useEffect(() => {
    // localStorage'dan ayarları yükle
    const storedDeviceId = localStorage.getItem("device_id");
    const storedPrinterName = localStorage.getItem("printer_name");
    if (storedDeviceId) setDeviceId(storedDeviceId);
    if (storedPrinterName) setPrinterName(storedPrinterName);

    // Yazıcıları preload.js üzerinden al
    if (window.api?.getPrinters) {
      window.api
        .getPrinters()
        .then((printers) => setAvailablePrinters(printers))
        .catch((err) => {
          console.error("Yazıcı listesi alınamadı:", err);
          toast.error("Yazıcılar alınamadı");
        });
    } else {
      toast.error("Yazıcı erişimi desteklenmiyor.");
    }
  }, []);

  const saveSettings = () => {
    if (!deviceId || !printerName) {
      return toast.error("Lütfen tüm alanları doldurun");
    }

    localStorage.setItem("device_id", deviceId);
    localStorage.setItem("printer_name", printerName);
    toast.success("✅ Ayarlar kaydedildi");
  };

  const testPrint = async () => {
    try {
      const result = await window.api?.printTest();
      if (result) {
        toast.success("🖨️ Test fişi yazdırıldı");
      } else {
        toast.error("❌ Yazdırma başarısız");
      }
    } catch (err) {
      toast.error("❌ Yazdırma hatası oluştu");
      console.error("Print test error:", err);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">🛠️ Ayarlar</h1>

      <label className="block mb-3">
        <span className="text-sm text-gray-600">📱 Cihaz ID</span>
        <input
          type="text"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          className="w-full border px-3 py-2 rounded mt-1"
        />
      </label>

      <label className="block mb-3">
        <span className="text-sm text-gray-600">🖨️ Yazıcı Seç</span>
        <select
          value={printerName}
          onChange={(e) => setPrinterName(e.target.value)}
          className="w-full border px-3 py-2 rounded mt-1"
        >
          <option value="">Yazıcı Seçin</option>
          {availablePrinters.map((name, index) => (
            <option key={index} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-4 mt-6">
        <button
          onClick={saveSettings}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          💾 Kaydet
        </button>
        <button
          onClick={testPrint}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          🧪 Yazıcı Testi
        </button>
      </div>
    </div>
  );
}
