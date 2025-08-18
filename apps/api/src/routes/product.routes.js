import express from "express";
import {
  createProduct,
  getAllProducts,
  updateProduct,
  deleteProduct
} from "../controllers/products.controller.js";

const router = express.Router();

router.post("/", createProduct);       // �r�n Ekle
router.get("/", getAllProducts);       // �r�nleri Listele
router.put("/:id", updateProduct);     // �r�n G�ncelle
router.delete("/:id", deleteProduct);  // �r�n Sil

export default router;
