import { Router } from "express";
import { createInvoiceLink } from "../controllers/invoice.controller";
import { requireTelegramAuth } from "../middlewares/telegramAuth";

const router = Router();

router.post("/create", requireTelegramAuth, createInvoiceLink);

export default router;
