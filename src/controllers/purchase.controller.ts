import { prisma } from "../prisma";

export async function getPurchaseHistory(req: any, res: any) {
  const { telegramId } = req.params;

  try {
    console.log("📊 Запрос истории покупок для:", telegramId);

    const purchases = await (prisma as any).purchase.findMany({
      where: { userId: telegramId },
      orderBy: {
        purchasedAt: "desc",
      },
    });

    console.log(`✅ Найдено ${purchases.length} записей`);

    // Форматируем даты для фронтенда
    const formattedPurchases = purchases.map((p: any) => ({
      id: p.id,
      date: new Date(p.purchasedAt).toLocaleDateString("ru-RU"),
      plan: p.plan,
      stars: p.stars,
      status: new Date(p.expiresAt) > new Date() ? "active" : "expired",
    }));

    res.json(formattedPurchases);
  } catch (error) {
    console.error("❌ Ошибка при получении истории покупок:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Дополнительно: получить статистику по бонусам
export async function getBonusHistory(req: any, res: any) {
  const { telegramId } = req.params;

  try {
    console.log("🎁 Запрос истории бонусов для:", telegramId);

    // Получаем информацию о реферальных бонусах
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

    // Формируем историю бонусов
    const bonusHistory = user.invitedUsers.map((inv: any) => ({
      id: inv.id,
      date: new Date(inv.activatedAt || inv.invitedAt).toLocaleDateString(
        "ru-RU",
      ),
      type: "referral_bonus",
      description: `Бонус за приглашение @${inv.invitedUser.username || "пользователя"}`,
      stars: 0, // бонусы в днях, не в звездах
      days: 3,
      status: "active",
    }));

    // Добавляем бонус за первый вход, если был
    if (user.hasClaimedBonus) {
      // Находим первую покупку или активацию
      const firstActivity = await (prisma as any).purchase.findFirst({
        where: { userId: telegramId },
        orderBy: { purchasedAt: "asc" },
      });

      bonusHistory.unshift({
        id: "first_bonus",
        date: firstActivity
          ? new Date(firstActivity.purchasedAt).toLocaleDateString("ru-RU")
          : new Date(user.createdAt).toLocaleDateString("ru-RU"),
        type: "welcome_bonus",
        description: "Бонус за первый вход",
        stars: 0,
        days: user.invitedBy ? 6 : 3,
        status: "active",
      });
    }

    res.json(bonusHistory);
  } catch (error) {
    console.error("❌ Ошибка при получении истории бонусов:", error);
    res.status(500).json({ error: "Server error" });
  }
}

// Объединенная история (покупки + бонусы)
export async function getFullHistory(req: any, res: any) {
  const { telegramId } = req.params;

  try {
    console.log("📚 Запрос полной истории для:", telegramId);

    // Получаем покупки
    const purchases = await (prisma as any).purchase.findMany({
      where: { userId: telegramId },
      orderBy: { purchasedAt: "desc" },
    });

    // Получаем информацию о пользователе для бонусов
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

    // Формируем полную историю
    const history: any[] = [];

    // Добавляем покупки
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

    // Добавляем реферальные бонусы
    user.invitedUsers.forEach((inv: any) => {
      history.push({
        id: `bonus_${inv.id}`,
        date: new Date(inv.activatedAt || inv.invitedAt).toLocaleDateString(
          "ru-RU",
        ),
        type: "referral_bonus",
        plan: "bonus",
        stars: 0,
        days: 3,
        description: `Бонус за приглашение @${inv.invitedUser.username || "пользователя"}`,
        status: "active",
      });
    });

    // Добавляем бонус за первый вход
    if (user.hasClaimedBonus) {
      const firstPurchase = purchases.length > 0 ? purchases[0] : null;
      const bonusDays = user.invitedBy ? 6 : 3;

      history.push({
        id: "welcome_bonus",
        date: firstPurchase
          ? new Date(firstPurchase.purchasedAt).toLocaleDateString("ru-RU")
          : new Date(user.createdAt).toLocaleDateString("ru-RU"),
        type: "welcome_bonus",
        plan: "bonus",
        stars: 0,
        days: bonusDays,
        description: `Бонус за первый вход (${bonusDays} дней)`,
        status: "active",
      });
    }

    // Сортируем по дате (сначала новые)
    history.sort((a, b) => {
      const dateA = a.date.split(".").reverse().join("-");
      const dateB = b.date.split(".").reverse().join("-");
      return dateB.localeCompare(dateA);
    });

    console.log(`✅ Сформировано ${history.length} записей истории`);
    res.json(history);
  } catch (error) {
    console.error("❌ Ошибка при получении полной истории:", error);
    res.status(500).json({ error: "Server error" });
  }
}
