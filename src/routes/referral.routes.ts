import { Router } from "express";
import { getReferralInfo, activateReferral, activateBonus } from "../controllers/referral.controller";

const router = Router();

router.get("/:telegramId", getReferralInfo);
router.post("/activate", activateReferral);
router.post("/bonus", activateBonus);

export default router;