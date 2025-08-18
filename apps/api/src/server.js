import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import salesRoutes from "./routes/sales.routes.js";
import productsRoutes from "./routes/products.routes.js"; // ✅ EKLENDİ
import reportsAdvancedRouter from "./routes/reportsAdvanced.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/sales", salesRoutes);
app.use("/api/products", productsRoutes); // ✅ EKLENDİ
app.use("/api/reports-advanced", reportsAdvancedRouter);

// Sağlık kontrolü
app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "API çalışıyor" });
});

// Port ve başlatma
const PORT = process.env.PORT || 3021;
app.listen(PORT, () => {
  console.log(`✅ API sunucusu ${PORT} portunda çalışıyor`);
});
