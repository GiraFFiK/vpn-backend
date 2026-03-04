import { Router } from "express";
import { getPurchaseHistory, getBonusHistory, getFullHistory } from "../controllers/purchase.controller";

const router = Router();

router.get("/history/:telegramId", getPurchaseHistory);
router.get("/bonus/:telegramId", getBonusHistory);
router.get("/full/:telegramId", getFullHistory);

export default router;