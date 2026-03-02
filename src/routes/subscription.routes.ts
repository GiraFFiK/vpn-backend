import { Router } from "express";
import { purchaseSubscription } from "../controllers/subscription.controller"; // Убрали getSubscription

const router = Router();

// Убрали этот маршрут
// router.get("/:telegramId", getSubscription);

router.post("/:telegramId/purchase", purchaseSubscription);

export default router;