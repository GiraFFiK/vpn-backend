import { Router } from "express";
import { sendInvoice } from "../controllers/invoice.controller";

const router = Router();

router.post("/buy", sendInvoice);

export default router;