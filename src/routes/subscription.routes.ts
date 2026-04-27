import { Router } from "express";
import { getExpiringSubscriptions, getSubscription, purchaseSubscription } from "../controllers/subscription.controller";
import { requireInternalBotAuth, requireTelegramAuthOrInternalBot, requireTelegramUserMatch } from "../middlewares/telegramAuth";

const router = Router();

router.get("/internal/expiring", requireInternalBotAuth, getExpiringSubscriptions);
router.get("/:telegramId", requireTelegramAuthOrInternalBot, requireTelegramUserMatch(), getSubscription);
router.post("/:telegramId/purchase", requireInternalBotAuth, purchaseSubscription);

export default router;
