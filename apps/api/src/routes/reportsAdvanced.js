import express from "express";
import { getAdvancedReport } from "../controllers/reportsAdvanced.controller.js";

const router = express.Router();

router.post("/", getAdvancedReport);

export default router;
