import { Router } from "express";
import { getUser, updateUser } from "../controllers/user.controller";
import { requireTelegramAuth, requireTelegramUserMatch } from "../middlewares/telegramAuth";

const router = Router();

router.get("/:telegramId", requireTelegramAuth, requireTelegramUserMatch(), getUser);
router.put("/:telegramId", requireTelegramAuth, requireTelegramUserMatch(), updateUser);

export default router;
