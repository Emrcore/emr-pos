import { Link, useLocation } from "react-router-dom";

const navItems = [
  { to: "/", label: "🧾 Satış" },
  { to: "/add-product", label: "➕ Ürün Ekle" },
  { to: "/reports-advanced", label: "📊 Rapor" },
  { to: "/settings", label: "⚙️ Ayarlar" },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="bg-gray-900 text-white px-4 py-2 flex gap-4">
      {navItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          className={`px-3 py-1 rounded hover:bg-gray-700 ${
            location.pathname === item.to ? "bg-gray-700" : ""
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
