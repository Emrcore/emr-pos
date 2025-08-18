import { useEffect, useRef, useState } from "react";
import axios from "../api/axios";
import ProductCard from "../components/ProductCard";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function Sales() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [paymentType, setPaymentType] = useState("nakit");
  const [loading, setLoading] = useState(true);
  const barcodeInputRef = useRef(null);
  const [selectedCategory, setSelectedCategory] = useState("Tümü");

  useEffect(() => {
    axios
      .get("/products")
      .then((res) => setProducts(res.data))
      .catch((err) => console.error("Ürünler alınamadı:", err))
      .finally(() => setLoading(false));
  }, []);

  const total = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);

  const printReceipt = (cart, total, paymentType, invoiceNumber) => {
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
          ${cart
            .map(
              (item) => `
                <div style="display: flex; justify-content: space-between;">
                  <span>${item.product_name} x${item.quantity}</span>
                  <span>${(item.price * item.quantity).toFixed(2)} ₺</span>
                </div>`
            )
            .join("")}
          <hr />
          <div style="display: flex; justify-content: space-between; font-weight: bold;">
            <span>Toplam:</span>
            <span>${total.toFixed(2)} ₺</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>Ödeme:</span>
            <span>${paymentType.toUpperCase()}</span>
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

  const categories = ["Tümü", ...new Set(products.map((p) => p.category || "Genel"))];

  const filteredProducts =
    selectedCategory === "Tümü"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const addProduct = (product) => {
    const existing = cart.find((p) => p.product_name === product.name);
    if (existing) {
      setCart(
        cart.map((p) =>
          p.product_name === product.name
            ? { ...p, quantity: p.quantity + 1 }
            : p
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product_name: product.name,
          quantity: 1,
          price: parseFloat(product.price),
          vat: parseFloat(product.vat) || 0,
        },
      ]);
    }
  };

  useEffect(() => {
  const input = barcodeInputRef.current;
  if (!input) return;

  let buffer = "";

  const handleKeyPress = (e) => {
    // Barkod okuyucu hızlıca karakter gönderdiği için buffer'da topla
    if (/^[a-zA-Z0-9]$/.test(e.key)) {
      buffer += e.key;
    }

    if (e.key === "Enter") {
      const code = buffer.trim();
      buffer = "";

      if (!code) return;

      const found = products.find((p) => p.barcode === code);
      if (found) {
        addProduct(found);
      } else {
        toast.error(`❌ Ürün bulunamadı: ${code}`);
      }
    }
  };

  window.addEventListener("keypress", handleKeyPress);
  return () => {
    window.removeEventListener("keypress", handleKeyPress);
  };
}, [products]);

  const handleSubmit = async () => {
    try {
      const res = await axios.post("/sales", {
        total,
        payment_type: paymentType,
        device_id: "test-device",
        items: cart,
      });

      const invoiceNumber = res.data.sale.invoice_number;
      toast.success("✅ Satış tamamlandı");
      printReceipt(cart, total, paymentType, invoiceNumber);
      setCart([]);
    } catch (err) {
      toast.error("❌ Satış hatası");
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <input
        ref={barcodeInputRef}
        placeholder="Barkod okutun"
        className="absolute w-0 h-0 opacity-0"
        autoFocus
      />

      <Link
        to="/add-product"
        className="inline-block bg-blue-500 text-white px-3 py-1 rounded mb-4"
      >
        ➕ Ürün Ekle
      </Link>

      <div
        tabIndex={0}
        onClick={() => barcodeInputRef.current?.focus()}
        className="text-sm text-gray-500 mb-2"
      >
        Barkod okutmak için lütfen buraya tıklayın veya okutmaya başlayın...
      </div>

      <h2 className="text-2xl font-bold mb-2">🛒 Ürünler</h2>

      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1 rounded-full border text-sm ${
              selectedCategory === cat
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Yükleniyor...</p>
      ) : filteredProducts.length === 0 ? (
        <p className="text-gray-500">Bu kategoride ürün bulunamadı.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filteredProducts.map((p) => (
            <ProductCard key={p.id} product={p} onAdd={addProduct} />
          ))}
        </div>
      )}

      <h2 className="text-xl font-bold mt-6">🧾 Sepet</h2>
      {cart.length === 0 && <p>Sepet boş</p>}
      {cart.map((item, i) => (
        <div key={i} className="flex justify-between border-b py-1 text-sm">
          <span>
            {item.product_name} x{item.quantity}
          </span>
          <span>{(item.price * item.quantity).toFixed(2)} ₺</span>
        </div>
      ))}

      <div className="mt-4">
        <label>Ödeme Türü:</label>
        <select
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value)}
          className="ml-2 border px-2 py-1 rounded"
        >
          <option value="nakit">Nakit</option>
          <option value="kart">Kart</option>
        </select>
      </div>

      <div className="mt-4 flex justify-between text-lg font-semibold">
        <span>Toplam:</span>
        <span>{total.toFixed(2)} ₺</span>
      </div>

      <button
        onClick={handleSubmit}
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded w-full mt-2"
      >
        ✅ Satışı Tamamla
      </button>
    </div>
  );
}
