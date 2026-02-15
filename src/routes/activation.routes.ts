import { Router } from "express";
import { getActivationCode, regenerateActivationCode } from "../controllers/activation.controller";

const router = Router();

router.get("/:telegramId", getActivationCode);
router.post("/:telegramId/regenerate", regenerateActivationCode);

export default router;