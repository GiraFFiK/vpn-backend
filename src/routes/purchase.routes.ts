import { Router } from "express";
import { getPurchaseHistory, getBonusHistory, getFullHistory } from "../controllers/purchase.controller";
import { requireTelegramAuth, requireTelegramUserMatch } from "../middlewares/telegramAuth";

const router = Router();

router.get("/history/:telegramId", requireTelegramAuth, requireTelegramUserMatch(), getPurchaseHistory);
router.get("/bonus/:telegramId", requireTelegramAuth, requireTelegramUserMatch(), getBonusHistory);
router.get("/full/:telegramId", requireTelegramAuth, requireTelegramUserMatch(), getFullHistory);

export default router;
