import { prisma } from "../prisma";
import crypto from "crypto";

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
  const { plan, stars } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 1. Проверяем, хватает ли звезд
    if (user.starsBalance < stars) {
      return res.status(400).json({ error: "Insufficient stars" });
    }

    // 2. Расчет дней в зависимости от плана
    const daysMap: Record<string, number> = {
      month: 30,
      "3months": 90,
      "6months": 180,
      year: 365
    };

    const days = daysMap[plan] || 30;
    
    // 3. Вычисляем новую дату окончания подписки
    const now = new Date();
    let startDate = now;
    
    if (user.subscriptionUntil && user.subscriptionUntil > now) {
      startDate = user.subscriptionUntil;
    }

    const expiresAt = new Date(startDate);
    expiresAt.setDate(expiresAt.getDate() + days);

    // 4. Обновляем подписку И списываем звезды в одной транзакции
    const updatedUser = await prisma.user.update({
      where: { telegramId },
      data: {
        subscriptionUntil: expiresAt,
        starsBalance: {
          decrement: stars
        }
      }
    });

    // 5. Создаем запись о покупке
    await (prisma as any).purchase.create({
      data: {
        userId: telegramId,
        plan: plan,
        stars: stars,
        expiresAt: expiresAt
      }
    });

    // 6. Генерируем новый код активации
    const randomBytes = crypto.randomBytes(8).toString('hex').toUpperCase();
    const newCode = randomBytes.match(/.{1,4}/g)?.join('-') || randomBytes;
    
    await (prisma as any).activationCode.upsert({
      where: { userId: telegramId },
      update: { code: newCode },
      create: {
        userId: telegramId,
        code: newCode
      }
    });

    console.log(`✅ Подписка оформлена для ${telegramId}: +${days} дней, списано ${stars} звезд. Новый баланс: ${updatedUser.starsBalance}`);

    res.json({
      success: true,
      subscriptionUntil: expiresAt,
      daysLeft: days,
      newBalance: updatedUser.starsBalance
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}