import { Router } from "express";
import { getStarsBalance } from "../controllers/stars.controller";

const router = Router();

router.get("/:telegramId", getStarsBalance);

export default router;
