import express from "express";
import {
  createProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  getProductByBarcode,
} from "../controllers/products.controller.js";

const router = express.Router();

// ? Ürün oluþtur
router.post("/", createProduct);

// ? Tüm ürünleri getir
router.get("/", getAllProducts);

// ? Belirli barkod ile ürünü getir
router.get("/barcode/:barcode", getProductByBarcode);

// ? Ürün güncelle
router.put("/:id", updateProduct);

// ? Ürün sil
router.delete("/:id", deleteProduct);

export default router;
