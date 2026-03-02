import { Router } from "express";
import { getStarsBalance, updateStarsBalance } from "../controllers/stars.controller";

const router = Router();

router.get("/:telegramId", getStarsBalance);
router.post("/:telegramId/update", updateStarsBalance);

export default router;