import { Router } from "express";
import { createInvoice } from "../controllers/invoice.controller";

const router = Router();

router.post("/create", createInvoice);

export default router;