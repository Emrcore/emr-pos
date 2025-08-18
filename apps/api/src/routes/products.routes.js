import express from "express";
import {
  createProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  getProductByBarcode,
} from "../controllers/products.controller.js";

const router = express.Router();

// ? �r�n olu�tur
router.post("/", createProduct);

// ? T�m �r�nleri getir
router.get("/", getAllProducts);

// ? Belirli barkod ile �r�n� getir
router.get("/barcode/:barcode", getProductByBarcode);

// ? �r�n g�ncelle
router.put("/:id", updateProduct);

// ? �r�n sil
router.delete("/:id", deleteProduct);

export default router;
