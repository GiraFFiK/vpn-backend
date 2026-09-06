import crypto from "crypto";
import { getPurchasableSubscriptionPlan } from "../config/subscriptionPlans";
import { prisma } from "../prisma";

export async function getSubscription(req: any, res: any) {
  const { telegramId } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const now = new Date();
    const isActive = user.subscriptionUntil
      ? user.subscriptionUntil > now
      : false;

    res.json({
      isActive,
      subscriptionUntil: user.subscriptionUntil,
      daysLeft: isActive
        ? Math.ceil(
            (user.subscriptionUntil!.getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}

export async function getExpiringSubscriptions(req: any, res: any) {
  try {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const users = await prisma.user.findMany({
      where: {
        subscriptionUntil: {
          gt: now,
          lte: tomorrow,
        },
      },
      select: {
        telegramId: true,
        firstName: true,
        username: true,
        subscriptionUntil: true,
      },
    });

    res.json({
      users: users.map((user) => ({
        ...user,
        daysLeft: 1,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}

export async function purchaseSubscription(req: any, res: any) {
  const { telegramId } = req.params;
  const { planId, period } = req.body;

  try {
    const subscription = getPurchasableSubscriptionPlan(planId, period);

    if (!subscription) {
      return res
        .status(403)
        .json({ error: "This subscription plan is not available" });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const days = subscription.days;
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
        subscriptionUntil: expiresAt,
      },
    });

    await (prisma as any).purchase.create({
      data: {
        userId: telegramId,
        plan: subscription.plan.id,
        stars: subscription.stars,
        expiresAt,
      },
    });

    const randomBytes = crypto.randomBytes(8).toString("hex").toUpperCase();
    const newCode = randomBytes.match(/.{1,4}/g)?.join("-") || randomBytes;

    const activationCode = await (prisma as any).activationCode.upsert({
      where: { userId: telegramId },
      update: { code: newCode },
      create: {
        userId: telegramId,
        code: newCode,
      },
    });

    console.log(
      `Subscription activated for ${telegramId}: +${days} days, charged ${subscription.stars} stars, up to ${subscription.plan.deviceLimit} devices`,
    );

    res.json({
      success: true,
      subscriptionUntil: expiresAt,
      daysLeft: days,
      activationCode: activationCode.code,
      starsCharged: subscription.stars,
      deviceLimit: subscription.plan.deviceLimit,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}
