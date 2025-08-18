import express from "express";
import {
  createSale,
  getAllSales,
  getDailySales,
  getSalesByProduct,
} from "../controllers/sales.controller.js";

const router = express.Router();

// ? Sat�� olu�tur
router.post("/", createSale);

// ?? T�m sat��lar� getir
router.get("/", getAllSales);

// ?? Bug�nk� sat�� toplam�
router.get("/daily", getDailySales);

// ?? �r�n bazl� sat�� �zeti
router.get("/by-product", getSalesByProduct);

export default router;
