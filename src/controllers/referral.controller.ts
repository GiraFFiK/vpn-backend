import { prisma } from "../prisma";
import crypto from "crypto";

export async function getReferralInfo(req: any, res: any) {
  const { telegramId } = req.params;

  try {
    console.log("📊 getReferralInfo для telegramId:", telegramId);

    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        invitedUsers: {
          include: {
            invitedUser: true
          }
        }
      }
    });

    if (!user) {
      console.log("❌ Пользователь не найден:", telegramId);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ Пользователь найден:", user.telegramId);
    console.log("📋 Количество приглашенных:", user.invitedUsers.length);

    const referralLink = `https://t.me/${process.env.BOT_USERNAME}?start=ref_${user.referralCode}`;

    const invitedList = user.invitedUsers.map(inv => ({
      id: inv.id,
      username: inv.invitedUser.username,
      firstName: inv.invitedUser.firstName,
      date: inv.invitedAt.toLocaleDateString('ru-RU'),
      status: inv.status,
      bonus: inv.bonusGiven ? 3 : 0
    }));

    res.json({
      referralCode: user.referralCode,
      referralLink,
      totalInvited: user.invitedUsers.length,
      activatedCount: user.invitedUsers.filter(inv => inv.status === "activated").length,
      totalBonus: user.referralBonus,
      invitedList
    });
  } catch (error) {
    console.error("❌ Ошибка в getReferralInfo:", error);
    res.status(500).json({ error: "Server error" });
  }
}

export async function activateReferral(req: any, res: any) {
  const { referralCode, newUserId } = req.body;

  try {
    console.log("🔄 ===== АКТИВАЦИЯ РЕФЕРАЛЬНОГО КОДА =====");
    console.log("📨 Полученные данные:", { referralCode, newUserId });

    if (!referralCode || !newUserId) {
      console.log("❌ Отсутствуют обязательные поля");
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Ищем пригласившего по реферальному коду
    console.log("🔍 Поиск пользователя с referralCode:", referralCode);
    const referrer = await prisma.user.findUnique({
      where: { referralCode }
    });

    if (!referrer) {
      console.log("❌ Реферальный код не найден в базе:", referralCode);
      return res.status(404).json({ error: "Invalid referral code" });
    }

    console.log("✅ Пригласивший найден:");
    console.log("   - telegramId:", referrer.telegramId);
    console.log("   - username:", referrer.username);
    console.log("   - referralCode:", referrer.referralCode);

    // 1. Проверяем, существует ли пользователь с таким newUserId
    console.log("🔍 Проверка существования пользователя с ID:", newUserId);
    let newUser = await prisma.user.findUnique({
      where: { telegramId: newUserId }
    });

    // 2. Если пользователя нет - создаем его
    if (!newUser) {
      console.log("📝 Пользователь не найден, создаем нового...");
      const newReferralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      
      newUser = await prisma.user.create({
        data: {
          telegramId: newUserId,
          referralCode: newReferralCode,
          username: `user_${newUserId}`,
          firstName: "User",
        }
      });
      console.log("✅ Новый пользователь создан:", newUser.telegramId);
    } else {
      console.log("✅ Пользователь уже существует");
    }

    // 3. Проверяем, не приглашал ли уже этот пользователь
    console.log("🔍 Проверка существующего приглашения для:", newUserId);
    const existingInvite = await (prisma as any).invitedUser.findUnique({
      where: { invitedUserId: newUserId }
    });

    if (existingInvite) {
      console.log("❌ Пользователь уже был приглашен ранее");
      console.log("   - Пригласивший:", existingInvite.referrerId);
      console.log("   - Статус:", existingInvite.status);
      return res.status(400).json({ error: "User already invited" });
    }

    // 4. Создаем запись о приглашении
    console.log("📝 Создание записи о приглашении...");
    const newInvite = await (prisma as any).invitedUser.create({
      data: {
        referrerId: referrer.telegramId,
        invitedUserId: newUserId,
        status: "pending"
      }
    });

    console.log("✅ Запись о приглашении создана:");
    console.log("   - ID:", newInvite.id);
    console.log("   - referrerId:", newInvite.referrerId);
    console.log("   - invitedUserId:", newInvite.invitedUserId);
    console.log("   - status:", newInvite.status);
    console.log("🔄 ===== АКТИВАЦИЯ ЗАВЕРШЕНА УСПЕШНО =====\n");

    res.json({ 
      success: true, 
      message: "Referral recorded. Bonus will be given upon first activation." 
    });
  } catch (error) {
    console.error("❌ ===== ОШИБКА В АКТИВАЦИИ =====");
    console.error("Детали ошибки:", error);
    console.error("=================================\n");
    res.status(500).json({ error: "Server error" });
  }
}

export async function activateBonus(req: any, res: any) {
  const { userId } = req.body;

  try {
    console.log("🎁 ===== АКТИВАЦИЯ БОНУСА =====");
    console.log("📨 Полученные данные:", { userId });

    if (!userId) {
      console.log("❌ Отсутствует userId");
      return res.status(400).json({ error: "Missing userId" });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: userId }
    });

    if (!user) {
      console.log("❌ Пользователь не найден:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ Пользователь найден:");
    console.log("   - telegramId:", user.telegramId);
    console.log("   - username:", user.username);
    console.log("   - hasClaimedBonus:", user.hasClaimedBonus);
    console.log("   - subscriptionUntil:", user.subscriptionUntil);

    if (user.hasClaimedBonus) {
      console.log("❌ Пользователь уже получал бонус");
      return res.status(400).json({ error: "Bonus already claimed" });
    }

    console.log("🔍 Поиск приглашения для пользователя:", userId);
    const invite = await (prisma as any).invitedUser.findUnique({
      where: { invitedUserId: userId }
    });

    let bonusDays = 3;
    console.log("📊 Базовый бонус:", bonusDays, "дней");

    if (invite) {
      bonusDays = 6;
      console.log("🎉 Пользователь был приглашен!");
      console.log("   - Пригласивший:", invite.referrerId);
      console.log("   - Текущий статус:", invite.status);
      console.log("📊 Итоговый бонус:", bonusDays, "дней");

      console.log("📝 Обновление статуса приглашения...");
      await (prisma as any).invitedUser.update({
        where: { invitedUserId: userId },
        data: {
          status: "activated",
          activatedAt: new Date(),
          bonusGiven: true
        }
      });

      console.log("🔍 Поиск пригласившего:", invite.referrerId);
      const referrer = await prisma.user.findUnique({
        where: { telegramId: invite.referrerId }
      });

      if (referrer) {
        console.log("✅ Пригласивший найден:", referrer.telegramId);
        console.log("📊 Текущая подписка пригласившего:", referrer.subscriptionUntil);
        
        const referrerCurrentDate = referrer.subscriptionUntil || new Date();
        const referrerNewDate = new Date(referrerCurrentDate.getTime() + (3 * 24 * 60 * 60 * 1000));
        
        console.log("📝 Начисление бонуса пригласившему...");
        await prisma.user.update({
          where: { telegramId: invite.referrerId },
          data: {
            subscriptionUntil: referrerNewDate,
            referralBonus: { increment: 3 }
          }
        });
        console.log("✅ Бонус пригласившему начислен");
      }
    }

    console.log("📝 Начисление бонуса пользователю...");
    const currentDate = user.subscriptionUntil || new Date();
    const newDate = new Date(currentDate.getTime() + (bonusDays * 24 * 60 * 60 * 1000));
    
    await prisma.user.update({
      where: { telegramId: userId },
      data: {
        subscriptionUntil: newDate,
        hasClaimedBonus: true
      }
    });

    console.log(`✅ Бонус активирован: +${bonusDays} дней для ${userId}`);
    console.log("📅 Новая дата подписки:", newDate);
    console.log("🎁 ===== АКТИВАЦИЯ БОНУСА ЗАВЕРШЕНА =====\n");

    res.json({ 
      success: true, 
      bonusDays,
      message: `Bonus activated: +${bonusDays} days` 
    });
  } catch (error) {
    console.error("❌ ===== ОШИБКА В АКТИВАЦИИ БОНУСА =====");
    console.error("Детали ошибки:", error);
    console.error("========================================\n");
    res.status(500).json({ error: "Server error" });
  }
}

export async function getUserByReferralCode(req: any, res: any) {
  const { referralCode } = req.params;

  try {
    console.log("🔍 Поиск пользователя по referralCode:", referralCode);
    
    const user = await prisma.user.findUnique({
      where: { referralCode }
    });

    if (!user) {
      console.log("❌ Пользователь не найден");
      return res.status(404).json({ error: "User not found" });
    }

    console.log("✅ Пользователь найден:", user.telegramId);
    res.json({ telegramId: user.telegramId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}