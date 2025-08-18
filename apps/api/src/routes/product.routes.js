import express from "express";
import {
  createProduct,
  getAllProducts,
  updateProduct,
  deleteProduct
} from "../controllers/products.controller.js";

const router = express.Router();

router.post("/", createProduct);       // Ürün Ekle
router.get("/", getAllProducts);       // Ürünleri Listele
router.put("/:id", updateProduct);     // Ürün Güncelle
router.delete("/:id", deleteProduct);  // Ürün Sil

export default router;
