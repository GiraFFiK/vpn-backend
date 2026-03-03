import { Router } from "express";
import { getReferralInfo, activateReferral, activateBonus, getUserByReferralCode } from "../controllers/referral.controller";

const router = Router();

router.get("/:telegramId", getReferralInfo);
router.get("/user/by-referral/:referralCode", getUserByReferralCode);
router.post("/activate", activateReferral);
router.post("/bonus", activateBonus);

export default router;