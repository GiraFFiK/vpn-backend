import { prisma } from "../prisma";

export async function getPurchaseHistory(req: any, res: any) {
  const { telegramId } = req.params;

  try {
    console.log("Запрос истории покупок для:", telegramId);

    const purchases = await (prisma as any).purchase.findMany({
      where: { userId: telegramId },
      orderBy: {
        purchasedAt: "desc",
      },
    });

    console.log(`Найдено ${purchases.length} записей`);

    const formattedPurchases = purchases.map((p: any) => ({
      id: p.id,
      date: new Date(p.purchasedAt).toLocaleDateString("ru-RU"),
      plan: p.plan,
      stars: p.stars,
      status: new Date(p.expiresAt) > new Date() ? "active" : "expired",
    }));

    res.json(formattedPurchases);
  } catch (error) {
    console.error("Ошибка при получении истории покупок:", error);
    res.status(500).json({ error: "Server error" });
  }
}

export async function getBonusHistory(req: any, res: any) {
  const { telegramId } = req.params;

  try {
    console.log("Запрос истории бонусов для:", telegramId);

    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        invitedUsers: {
          where: { bonusGiven: true },
          include: {
            invitedUser: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const bonusHistory = user.invitedUsers.map((inv: any) => ({
      id: inv.id,
      date: new Date(inv.activatedAt || inv.invitedAt).toLocaleDateString("ru-RU"),
      type: "referral_bonus",
      description: `Бонус за приглашение @${inv.invitedUser.username || "пользователя"}`,
      stars: 0,
      days: 3,
      status: "active",
    }));

    if (user.hasClaimedBonus) {
      bonusHistory.unshift({
        id: "first_bonus",
        date: new Date(user.createdAt).toLocaleDateString("ru-RU"),
        type: "welcome_bonus",
        description: "Бонус за первый вход",
        stars: 0,
        days: 3,
        status: "active",
      });
    }

    res.json(bonusHistory);
  } catch (error) {
    console.error("Ошибка при получении истории бонусов:", error);
    res.status(500).json({ error: "Server error" });
  }
}

export async function getFullHistory(req: any, res: any) {
  const { telegramId } = req.params;

  try {
    console.log("Запрос полной истории для:", telegramId);

    const purchases = await (prisma as any).purchase.findMany({
      where: { userId: telegramId },
      orderBy: { purchasedAt: "desc" },
    });

    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        invitedUsers: {
          where: { bonusGiven: true },
          include: {
            invitedUser: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const wasInvited = await (prisma as any).invitedUser.findUnique({
      where: { invitedUserId: telegramId },
    });

    console.log("Информация о пользователе:", {
      telegramId,
      hasClaimedBonus: user.hasClaimedBonus,
      wasInvited: !!wasInvited,
      invitedBy: wasInvited?.referrerId,
    });

    const history: any[] = [];

    purchases.forEach((p: any) => {
      history.push({
        id: `purchase_${p.id}`,
        date: new Date(p.purchasedAt).toLocaleDateString("ru-RU"),
        type: "purchase",
        plan: p.plan,
        stars: p.stars,
        days: 0,
        description: `Покупка ${
          p.plan === "month"
            ? "1 месяца"
            : p.plan === "3months"
              ? "3 месяцев"
              : p.plan === "6months"
                ? "6 месяцев"
                : "1 года"
        }`,
        status: new Date(p.expiresAt) > new Date() ? "active" : "expired",
      });
    });

    if (user.hasClaimedBonus) {
      const bonusDays = wasInvited ? 6 : 3;
      const bonusDate = new Date(user.createdAt);

      const description = wasInvited
        ? "Бонус за первый вход + приглашение (6 дней)"
        : "Бонус за первый вход (3 дня)";

      history.push({
        id: "welcome_bonus",
        date: bonusDate.toLocaleDateString("ru-RU"),
        type: "welcome_bonus",
        plan: "bonus",
        stars: 0,
        days: bonusDays,
        description,
        status: "active",
      });
    }

    user.invitedUsers.forEach((inv: any) => {
      const invitedUser = inv.invitedUser;

      history.push({
        id: `bonus_${inv.id}`,
        date: new Date(inv.activatedAt || inv.invitedAt).toLocaleDateString("ru-RU"),
        type: "referral_bonus",
        plan: "bonus",
        stars: 0,
        days: 3,
        description: `Бонус за приглашение @${invitedUser?.username || "пользователя"}`,
        status: "active",
      });
    });

    history.sort((a, b) => {
      const dateA = a.date.split(".").reverse().join("-");
      const dateB = b.date.split(".").reverse().join("-");
      return dateB.localeCompare(dateA);
    });

    console.log(`Сформировано ${history.length} записей истории`);
    console.log("Детали бонусов:", {
      welcomeBonusDays: user.hasClaimedBonus ? (wasInvited ? 6 : 3) : 0,
      wasInvited: !!wasInvited,
      referralBonuses: user.invitedUsers.length,
    });

    res.json(history);
  } catch (error) {
    console.error("Ошибка при получении полной истории:", error);
    res.status(500).json({ error: "Server error" });
  }
}
