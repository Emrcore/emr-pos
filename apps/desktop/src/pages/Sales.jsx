import { useEffect, useRef, useState, useMemo } from "react";
import axios from "../api/axios";
import toast from "react-hot-toast";

export default function Sales() {
  // --- State ---
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [paymentType, setPaymentType] = useState("nakit");
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("Tümü");
  const barcodeInputRef = useRef(null);

  // --- Fetch products ---
  useEffect(() => {
    let mounted = true;
    axios
      .get("/products")
      .then((res) => mounted && setProducts(res.data || []))
      .catch((err) => console.error("Ürünler alınamadı:", err))
      .finally(() => mounted && setLoading(false));
    return () => (mounted = false);
  }, []);

  // --- Derived data ---
  const categories = useMemo(
    () => ["Tümü", ...new Set((products || []).map((p) => p.category || "Genel"))],
    [products]
  );

  const filteredProducts = useMemo(() => {
    return selectedCategory === "Tümü"
      ? products
      : products.filter((p) => (p.category || "Genel") === selectedCategory);
  }, [products, selectedCategory]);

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity * item.price, 0),
    [cart]
  );

  // --- Helpers: cart ops ---
  const addProduct = (product) => {
    const name = product.name;
    const price = parseFloat(product.price);
    const vat = parseFloat(product.vat) || 0;

    setCart((prev) => {
      const i = prev.findIndex((p) => p.product_name === name);
      if (i >= 0) {
        const clone = [...prev];
        clone[i] = { ...clone[i], quantity: clone[i].quantity + 1 };
        return clone;
      }
      return [...prev, { product_name: name, quantity: 1, price, vat }];
    });
  };

  const inc = (name) =>
    setCart((prev) =>
      prev.map((i) => (i.product_name === name ? { ...i, quantity: i.quantity + 1 } : i))
    );

  const dec = (name) =>
    setCart((prev) =>
      prev
        .map((i) =>
          i.product_name === name ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i
        )
        .filter((i) => i.quantity > 0)
    );

  const removeItem = (name) =>
    setCart((prev) => prev.filter((i) => i.product_name !== name));

  // --- Barcode handler (keyboard buffer) ---
  useEffect(() => {
    const input = barcodeInputRef.current;
    if (!input) return;
    let buffer = "";
    let timer;

    const handleKeyPress = (e) => {
      // Barkod okuyucular çok hızlı tuş basar; hepsini topla
      if (/^[\w\-\/]+$/.test(e.key)) {
        buffer += e.key;
        // kısa süre yazı gelmezse buffer'ı sıfırlama
        clearTimeout(timer);
        timer = setTimeout(() => (buffer = ""), 80);
      }
      if (e.key === "Enter") {
        const code = buffer.trim();
        buffer = "";
        clearTimeout(timer);
        if (!code) return;
        const found = products.find((p) => String(p.barcode) === code);
        if (found) addProduct(found);
        else toast.error(`❌ Ürün bulunamadı: ${code}`);
      }
    };

    window.addEventListener("keypress", handleKeyPress);
    return () => window.removeEventListener("keypress", handleKeyPress);
  }, [products]);

  // --- Receipt printing ---
  const printReceipt = (cartItems, grandTotal, payType, invoiceNumber) => {
    const date = new Date().toLocaleString("tr-TR");
    const receiptHtml = `
      <html>
        <head>
          <title>Fiş</title>
          <style>
            body { font-family: monospace; font-size: 12px; width: 250px; padding: 10px; }
            .center { text-align: center; font-weight: bold; }
            hr { margin: 10px 0; border: none; border-top: 1px dashed #999; }
          </style>
        </head>
        <body>
          <div class="center">EMR POS</div>
          <div class="center">FİŞ NO: #${invoiceNumber}</div>
          <div class="center">${date}</div>
          <hr />
          ${cartItems
            .map(
              (item) => `
                <div style="display:flex;justify-content:space-between;">
                  <span>${item.product_name} x${item.quantity}</span>
                  <span>${(item.price * item.quantity).toFixed(2)} ₺</span>
                </div>`
            )
            .join("")}
          <hr />
          <div style="display:flex;justify-content:space-between;font-weight:bold;">
            <span>Toplam:</span>
            <span>${grandTotal.toFixed(2)} ₺</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span>Ödeme:</span>
            <span>${payType.toUpperCase()}</span>
          </div>
          <p class="center" style="margin-top: 20px;">Bizi tercih ettiğiniz için teşekkür ederiz</p>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 300);
            };
          </script>
        </body>
      </html>
    `;
    const win = window.open("", "_blank", "width=300,height=600");
    win.document.write(receiptHtml);
    win.document.close();
  };

  // --- Submit sale ---
  const handleSubmit = async () => {
    if (cart.length === 0) {
      toast.error("Sepet boş");
      return;
    }
    try {
      const res = await axios.post("/sales", {
        total,
        payment_type: paymentType,
        device_id: "test-device",
        items: cart,
      });
      const invoiceNumber = res?.data?.sale?.invoice_number ?? "-";
      toast.success("✅ Satış tamamlandı");
      printReceipt(cart, total, paymentType, invoiceNumber);
      setCart([]);
    } catch (err) {
      console.error(err);
      toast.error("❌ Satış hatası");
    }
  };

  // --- UI ---
  return (
    <div
      className="min-h-screen w-full bg-neutral-950 text-neutral-50"
      onClick={() => barcodeInputRef.current?.focus()}
    >
      {/* Gizli input – barkod okuyucu için focus tutulur */}
      <input
        ref={barcodeInputRef}
        className="absolute w-0 h-0 opacity-0"
        autoFocus
        aria-hidden
      />

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/10 backdrop-blur bg-neutral-950/70">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-extrabold tracking-tight">EMR POS — Satış</h1>
          <div className="text-xs text-neutral-400">
            Barkod okutmak için ekranın herhangi bir yerine tıklayabilirsiniz
          </div>
        </div>
      </header>

      {/* Content: 2 kolon — Sol: ödeme/sepet, Sağ: ürünler */}
      <div className="max-w-7xl mx-auto px-4 py-4 grid md:grid-cols-2 gap-4">
        {/* LEFT: Payment / Cart */}
        <section className="md:order-1 bg-neutral-900/60 rounded-2xl border border-white/10 p-4">
          <h2 className="text-lg font-semibold mb-3">🧾 Sepet ve Ödeme</h2>

          {/* Cart List */}
          <div className="space-y-2 max-h-[48vh] overflow-auto pr-1">
            {cart.length === 0 && (
              <div className="text-neutral-400 text-sm">Sepet boş</div>
            )}

            {cart.map((item) => (
              <div
                key={item.product_name}
                className="flex items-center justify-between bg-neutral-800/60 rounded-xl px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{item.product_name}</div>
                  <div className="text-xs text-neutral-400">
                    {item.price.toFixed(2)} ₺ × {item.quantity}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => dec(item.product_name)}
                    className="h-8 w-8 rounded-lg border border-white/10 hover:bg-white/5"
                    title="Azalt"
                  >
                    −
                  </button>
                  <span className="w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => inc(item.product_name)}
                    className="h-8 w-8 rounded-lg border border-white/10 hover:bg-white/5"
                    title="Arttır"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeItem(item.product_name)}
                    className="h-8 px-2 rounded-lg border border-white/10 hover:bg-white/5 text-xs"
                    title="Kaldır"
                  >
                    Kaldır
                  </button>
                  <div className="w-20 text-right font-semibold">
                    {(item.price * item.quantity).toFixed(2)} ₺
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 border-t border-white/10 pt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">Ara Toplam</span>
              <span>{total.toFixed(2)} ₺</span>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-neutral-400">Ödeme Türü</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="bg-neutral-900 border border-white/10 rounded-xl px-3 py-2 text-sm"
              >
                <option value="nakit">Nakit</option>
                <option value="kart">Kart</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-lg font-bold">
              <span>Toplam</span>
              <span>{total.toFixed(2)} ₺</span>
            </div>

            <button
              onClick={handleSubmit}
              className="mt-2 w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 transition font-semibold"
            >
              ✅ Satışı Tamamla
            </button>
          </div>
        </section>

        {/* RIGHT: Products */}
        <section className="md:order-2">
          {/* Category Pills */}
          <div className="sticky top-[60px] z-30 pb-3 bg-neutral-950/70 backdrop-blur">
            <div className="flex items-center gap-2 overflow-auto no-scrollbar py-2">
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={
                      "px-3 py-1.5 rounded-full border text-sm whitespace-nowrap transition " +
                      (active
                        ? "bg-white text-neutral-900 border-white"
                        : "bg-neutral-900 border-white/10 text-neutral-300 hover:bg-neutral-800")
                    }
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Products Grid as buttons */}
          <div className="mt-2 bg-neutral-900/60 rounded-2xl border border-white/10 p-3">
            <h2 className="text-lg font-semibold mb-3">🛒 Ürünler</h2>

            {loading ? (
              <div className="text-neutral-400 text-sm">Yükleniyor…</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-neutral-400 text-sm">
                Bu kategoride ürün bulunamadı.
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id || p._id || p.barcode || p.name}
                    onClick={() => addProduct(p)}
                    className="group text-left rounded-xl border border-white/10 bg-neutral-800/50 hover:bg-neutral-800 transition p-3"
                    title={`${p.name} — ${(parseFloat(p.price) || 0).toFixed(2)} ₺`}
                  >
                    <div className="font-semibold truncate group-hover:translate-x-[1px] transition">
                      {p.name}
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5 truncate">
                      {(parseFloat(p.price) || 0).toFixed(2)} ₺
                      {p.barcode ? ` • ${p.barcode}` : ""}
                    </div>
                    <div className="mt-2 text-xs text-neutral-300">
                      {(p.category || "Genel")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
