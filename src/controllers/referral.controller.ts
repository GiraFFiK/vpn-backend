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

export async function activateReferral(req: any, res: any) {
  const { referralCode, newUserId } = req.body;

  try {
    const referrer = await prisma.user.findUnique({
      where: { referralCode }
    });

    if (!referrer) {
      return res.status(404).json({ error: "Invalid referral code" });
    }

    // Используем правильное название модели - InvitedUser (с большой буквы)
    const existingInvite = await (prisma as any).invitedUser.findUnique({
      where: { invitedUserId: newUserId }
    });

    if (existingInvite) {
      return res.status(400).json({ error: "User already invited" });
    }

    await (prisma as any).invitedUser.create({
      data: {
        referrerId: referrer.telegramId,
        invitedUserId: newUserId,
        status: "pending"
      }
    });

    res.json({ success: true, message: "Referral recorded" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}

export async function activateBonus(req: any, res: any) {
  const { userId } = req.body;

  try {
    const invite = await (prisma as any).invitedUser.findUnique({
      where: { invitedUserId: userId },
      include: { invitedUser: true }
    });

    if (!invite) {
      return res.status(404).json({ error: "Invite not found" });
    }

    if (invite.status === "activated") {
      return res.status(400).json({ error: "Bonus already given" });
    }

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
      const currentDate = referrer.subscriptionUntil || new Date();
      const newDate = new Date(currentDate.getTime() + (3 * 24 * 60 * 60 * 1000));
      
      await prisma.user.update({
        where: { telegramId: invite.referrerId },
        data: {
          referralBonus: { increment: 3 },
          subscriptionUntil: newDate
        }
      });
    }

    // Начисляем бонус приглашенному
    const invited = await prisma.user.findUnique({
      where: { telegramId: userId }
    });

    if (invited) {
      const currentDate = invited.subscriptionUntil || new Date();
      const newDate = new Date(currentDate.getTime() + (3 * 24 * 60 * 60 * 1000));
      
      await prisma.user.update({
        where: { telegramId: userId },
        data: {
          subscriptionUntil: newDate
        }
      });
    }

    res.json({ success: true, message: "Bonus activated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}