import { Router } from "express";
import { getSubscription, purchaseSubscription } from "../controllers/subscription.controller";

const router = Router();

router.get("/:telegramId", getSubscription);
router.post("/:telegramId/purchase", purchaseSubscription);

export default router;