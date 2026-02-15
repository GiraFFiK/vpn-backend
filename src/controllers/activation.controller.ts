import { prisma } from "../prisma";
import crypto from "crypto";

export async function getActivationCode(req: any, res: any) {
  const { telegramId } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const now = new Date();
    const isActive = user.subscriptionUntil ? user.subscriptionUntil > now : false;

    if (!isActive) {
      return res.json({ hasSubscription: false, code: null });
    }

    // Правильное название модели ActivationCode (множественное число в Prisma)
    let activationCode = await (prisma as any).activationCode.findUnique({
      where: { userId: telegramId }
    });

    if (!activationCode) {
      const randomBytes = crypto.randomBytes(8).toString('hex').toUpperCase();
      const newCode = randomBytes.match(/.{1,4}/g)?.join('-') || randomBytes;
      
      activationCode = await (prisma as any).activationCode.create({
        data: {
          userId: telegramId,
          code: newCode
        }
      });
    }

    res.json({
      hasSubscription: true,
      code: activationCode.code
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}

export async function regenerateActivationCode(req: any, res: any) {
  const { telegramId } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const now = new Date();
    const isActive = user.subscriptionUntil ? user.subscriptionUntil > now : false;

    if (!isActive) {
      return res.status(403).json({ error: "No active subscription" });
    }

    const randomBytes = crypto.randomBytes(8).toString('hex').toUpperCase();
    const newCode = randomBytes.match(/.{1,4}/g)?.join('-') || randomBytes;

    const activationCode = await (prisma as any).activationCode.upsert({
      where: { userId: telegramId },
      update: { code: newCode },
      create: {
        userId: telegramId,
        code: newCode
      }
    });

    res.json({ code: activationCode.code });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}