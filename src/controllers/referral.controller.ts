import { prisma } from "../prisma";

export async function getReferralInfo(req: any, res: any) {
  const { telegramId } = req.params;

  try {
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
      return res.status(404).json({ error: "User not found" });
    }

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
    console.error("Error in getReferralInfo:", error);
    res.status(500).json({ error: "Server error" });
  }
}

export async function activateReferral(req: any, res: any) {
  const { referralCode, newUserId } = req.body;

  try {
    console.log("🔄 Активация реферального кода:", referralCode, "для пользователя:", newUserId);

    // Ищем пригласившего по реферальному коду
    const referrer = await prisma.user.findUnique({
      where: { referralCode }
    });

    if (!referrer) {
      console.log("❌ Реферальный код не найден:", referralCode);
      return res.status(404).json({ error: "Invalid referral code" });
    }

    console.log("✅ Пригласивший найден:", referrer.telegramId);

    // Проверяем, не приглашал ли уже этот пользователь
    const existingInvite = await (prisma as any).invitedUser.findUnique({
      where: { invitedUserId: newUserId }
    });

    if (existingInvite) {
      console.log("❌ Пользователь уже был приглашен:", newUserId);
      return res.status(400).json({ error: "User already invited" });
    }

    // Создаем запись о приглашении
    await (prisma as any).invitedUser.create({
      data: {
        referrerId: referrer.telegramId,
        invitedUserId: newUserId,
        status: "pending"
      }
    });

    console.log(`✅ Запись о приглашении создана: ${referrer.telegramId} -> ${newUserId}`);

    res.json({ 
      success: true, 
      message: "Referral recorded. Bonus will be given upon first activation." 
    });
  } catch (error) {
    console.error("❌ Error in activateReferral:", error);
    res.status(500).json({ error: "Server error" });
  }
}

export async function activateBonus(req: any, res: any) {
  const { userId } = req.body;

  try {
    console.log("🔄 Активация бонуса для пользователя:", userId);

    const user = await prisma.user.findUnique({
      where: { telegramId: userId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Проверяем, получал ли уже пользователь бонус
    if (user.hasClaimedBonus) {
      return res.status(400).json({ error: "Bonus already claimed" });
    }

    // Ищем, был ли пользователь приглашен
    const invite = await (prisma as any).invitedUser.findUnique({
      where: { invitedUserId: userId }
    });

    let bonusDays = 3; // Базовый бонус

    // Если пользователь был приглашен, добавляем дополнительный бонус
    if (invite) {
      bonusDays = 6; // 3 базовых + 3 за приглашение
      
      console.log("🎁 Пользователь был приглашен, обновляем статус приглашения");

      // Обновляем статус приглашения
      await (prisma as any).invitedUser.update({
        where: { invitedUserId: userId },
        data: {
          status: "activated",
          activatedAt: new Date(),
          bonusGiven: true
        }
      });

      // Начисляем бонус пригласившему
      const referrer = await prisma.user.findUnique({
        where: { telegramId: invite.referrerId }
      });

      if (referrer) {
        console.log("🎁 Начисляем бонус пригласившему:", referrer.telegramId);
        
        const referrerCurrentDate = referrer.subscriptionUntil || new Date();
        const referrerNewDate = new Date(referrerCurrentDate.getTime() + (3 * 24 * 60 * 60 * 1000));
        
        await prisma.user.update({
          where: { telegramId: invite.referrerId },
          data: {
            subscriptionUntil: referrerNewDate,
            referralBonus: { increment: 3 }
          }
        });
      }
    }

    // Начисляем бонус пользователю
    console.log(`🎁 Начисляем ${bonusDays} дней пользователю ${userId}`);
    
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

    res.json({ 
      success: true, 
      bonusDays,
      message: `Bonus activated: +${bonusDays} days` 
    });
  } catch (error) {
    console.error("❌ Error in activateBonus:", error);
    res.status(500).json({ error: "Server error" });
  }
}