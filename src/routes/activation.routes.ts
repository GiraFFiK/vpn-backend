import { Router } from "express";
import { getActivationCode, regenerateActivationCode } from "../controllers/activation.controller";
import { requireTelegramAuth, requireTelegramUserMatch } from "../middlewares/telegramAuth";

const router = Router();

router.get("/:telegramId", requireTelegramAuth, requireTelegramUserMatch(), getActivationCode);
router.post("/:telegramId/regenerate", requireTelegramAuth, requireTelegramUserMatch(), regenerateActivationCode);

export default router;
