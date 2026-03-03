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
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}

// Эндпоинт для активации реферального кода (вызывается из бота)
export async function activateReferral(req: any, res: any) {
  const { referralCode, newUserId } = req.body;

  try {
    const referrer = await prisma.user.findUnique({
      where: { referralCode }
    });

    if (!referrer) {
      return res.status(404).json({ error: "Invalid referral code" });
    }

    // Проверяем, не приглашал ли уже этот пользователь
    const existingInvite = await (prisma as any).invitedUser.findUnique({
      where: { invitedUserId: newUserId }
    });

    if (existingInvite) {
      return res.status(400).json({ error: "User already invited" });
    }

    // Сохраняем информацию о приглашении, но бонус начислится при первой активации
    await (prisma as any).invitedUser.create({
      data: {
        referrerId: referrer.telegramId,
        invitedUserId: newUserId,
        status: "pending"
      }
    });

    console.log(`📝 Пользователь ${newUserId} был приглашен ${referrer.telegramId}`);

    res.json({ 
      success: true, 
      message: "Referral recorded. Bonus will be given upon first activation." 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}

// Эндпоинт для ручной активации бонуса (если нужно)
export async function activateBonus(req: any, res: any) {
  const { userId } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId: userId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.hasClaimedBonus) {
      return res.status(400).json({ error: "Bonus already claimed" });
    }

    // Находим, был ли пользователь приглашен
    const invite = await (prisma as any).invitedUser.findUnique({
      where: { invitedUserId: userId }
    });

    let bonusDays = 3; // Базовый бонус

    if (invite) {
      bonusDays = 6; // 3 базовых + 3 за приглашение
      
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
    const currentDate = user.subscriptionUntil || new Date();
    const newDate = new Date(currentDate.getTime() + (bonusDays * 24 * 60 * 60 * 1000));
    
    await prisma.user.update({
      where: { telegramId: userId },
      data: {
        subscriptionUntil: newDate,
        hasClaimedBonus: true
      }
    });

    console.log(`🎉 Пользователь ${userId} активировал бонус: +${bonusDays} дней`);

    res.json({ 
      success: true, 
      bonusDays,
      message: `Bonus activated: +${bonusDays} days` 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}