import crypto from "crypto";
import { getSubscriptionPlan } from "../config/subscriptionPlans";
import { prisma } from "../prisma";

export async function getSubscription(req: any, res: any) {
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

    res.json({
      isActive,
      subscriptionUntil: user.subscriptionUntil,
      daysLeft: isActive ? Math.ceil((user.subscriptionUntil!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}

export async function purchaseSubscription(req: any, res: any) {
  const { telegramId } = req.params;
  const { plan } = req.body;

  try {
    const subscriptionPlan = getSubscriptionPlan(plan);

    if (!subscriptionPlan || !subscriptionPlan.active) {
      return res.status(400).json({ error: "Invalid subscription plan" });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const days = subscriptionPlan.days;

    const now = new Date();
    let startDate = now;

    if (user.subscriptionUntil && user.subscriptionUntil > now) {
      startDate = user.subscriptionUntil;
    }

    const expiresAt = new Date(startDate);
    expiresAt.setDate(expiresAt.getDate() + days);

    await prisma.user.update({
      where: { telegramId },
      data: {
        subscriptionUntil: expiresAt
      }
    });

    await (prisma as any).purchase.create({
      data: {
        userId: telegramId,
        plan: subscriptionPlan.id,
        stars: subscriptionPlan.stars,
        expiresAt
      }
    });

    const randomBytes = crypto.randomBytes(8).toString("hex").toUpperCase();
    const newCode = randomBytes.match(/.{1,4}/g)?.join("-") || randomBytes;

    const activationCode = await (prisma as any).activationCode.upsert({
      where: { userId: telegramId },
      update: { code: newCode },
      create: {
        userId: telegramId,
        code: newCode
      }
    });

    console.log(`вњ… РџРѕРґРїРёСЃРєР° РѕС„РѕСЂРјР»РµРЅР° РґР»СЏ ${telegramId}: +${days} РґРЅРµР№, СЃРїРёСЃР°РЅРѕ ${subscriptionPlan.stars} Р·РІРµР·Рґ`);

    res.json({
      success: true,
      subscriptionUntil: expiresAt,
      daysLeft: days,
      activationCode: activationCode.code,
      starsCharged: subscriptionPlan.stars
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}
