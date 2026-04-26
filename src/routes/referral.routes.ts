import { Router } from "express";
import { getReferralInfo, activateReferral, activateBonus, getUserByReferralCode } from "../controllers/referral.controller";
import { requireInternalBotAuth, requireTelegramAuthOrInternalBot, requireTelegramUserMatch } from "../middlewares/telegramAuth";

const router = Router();

router.get("/user/by-referral/:referralCode", requireInternalBotAuth, getUserByReferralCode);
router.post("/activate", requireInternalBotAuth, activateReferral);
router.post("/bonus", requireInternalBotAuth, activateBonus);
router.get("/:telegramId", requireTelegramAuthOrInternalBot, requireTelegramUserMatch(), getReferralInfo);

export default router;

