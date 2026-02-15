import { Router } from "express";
import { getUser, updateUser } from "../controllers/user.controller";

const router = Router();

router.get("/:telegramId", getUser);
router.put("/:telegramId", updateUser);

export default router;