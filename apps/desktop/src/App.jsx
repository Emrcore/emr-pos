import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sales from "./pages/Sales";
import ProductAdd from "./pages/ProductAdd";
import ReportAdvanced from "./pages/ReportAdvanced";
import Settings from "./pages/Settings";
import RequireAuth from "./components/RequireAuth";
import Navbar from "./components/Navbar"; // ✅ Navbar eklendi

export default function App() {
  return (
    <Router>
      <Navbar /> {/* ✅ Tüm sayfalarda görünür */}
      <Routes>
        <Route path="/" element={<Sales />} />
        <Route path="/add-product" element={<ProductAdd />} />
        <Route path="/reports-advanced" element={<ReportAdvanced />} />
<Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}
