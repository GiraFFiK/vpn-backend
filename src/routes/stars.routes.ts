import { Router } from "express";
import { getStarsBalance, updateStarsBalance } from "../controllers/stars.controller";
import { requireTelegramAuth, requireTelegramUserMatch } from "../middlewares/telegramAuth";

const router = Router();

router.get("/:telegramId", requireTelegramAuth, requireTelegramUserMatch(), getStarsBalance);
router.post("/:telegramId/update", requireTelegramAuth, requireTelegramUserMatch(), updateStarsBalance);

export default router;
