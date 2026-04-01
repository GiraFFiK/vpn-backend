import { Router } from "express";
import { createInvoiceLink } from "../controllers/invoice.controller";

const router = Router();

router.post("/create", createInvoiceLink);

export default router;