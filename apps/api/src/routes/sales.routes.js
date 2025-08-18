import express from "express";
import {
  createSale,
  getAllSales,
  getDailySales,
  getSalesByProduct,
} from "../controllers/sales.controller.js";

const router = express.Router();

// ? Satýþ oluþtur
router.post("/", createSale);

// ?? Tüm satýþlarý getir
router.get("/", getAllSales);

// ?? Bugünkü satýþ toplamý
router.get("/daily", getDailySales);

// ?? Ürün bazlý satýþ özeti
router.get("/by-product", getSalesByProduct);

export default router;
