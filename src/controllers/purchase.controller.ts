import { prisma } from "../prisma";

export async function getPurchaseHistory(req: any, res: any) {
  const { telegramId } = req.params;

  try {
    console.log("рџ“Љ Р—Р°РїСЂРѕСЃ РёСЃС‚РѕСЂРёРё РїРѕРєСѓРїРѕРє РґР»СЏ:", telegramId);

    const purchases = await (prisma as any).purchase.findMany({
      where: { userId: telegramId },
      orderBy: {
        purchasedAt: "desc"
      }
    });

    console.log(`вњ… РќР°Р№РґРµРЅРѕ ${purchases.length} Р·Р°РїРёСЃРµР№`);

    const formattedPurchases = purchases.map((p: any) => ({
      id: p.id,
      date: new Date(p.purchasedAt).toLocaleDateString("ru-RU"),
      plan: p.plan,
      stars: p.stars,
      status: new Date(p.expiresAt) > new Date() ? "active" : "expired"
    }));

    res.json(formattedPurchases);
  } catch (error) {
    console.error("вќЊ РћС€РёР±РєР° РїСЂРё РїРѕР»СѓС‡РµРЅРёРё РёСЃС‚РѕСЂРёРё РїРѕРєСѓРїРѕРє:", error);
    res.status(500).json({ error: "Server error" });
  }
}

export async function getBonusHistory(req: any, res: any) {
  const { telegramId } = req.params;

  try {
    console.log("рџЋЃ Р—Р°РїСЂРѕСЃ РёСЃС‚РѕСЂРёРё Р±РѕРЅСѓСЃРѕРІ РґР»СЏ:", telegramId);

    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        invitedUsers: {
          where: { bonusGiven: true },
          include: {
            invitedUser: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const bonusHistory = user.invitedUsers.map((inv: any) => ({
      id: inv.id,
      date: new Date(inv.activatedAt || inv.invitedAt).toLocaleDateString("ru-RU"),
      type: "referral_bonus",
      description: `Р‘РѕРЅСѓСЃ Р·Р° РїСЂРёРіР»Р°С€РµРЅРёРµ @${inv.invitedUser.username || "РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ"}`,
      stars: 0,
      days: 3,
      status: "active"
    }));

    if (user.hasClaimedBonus) {
      bonusHistory.unshift({
        id: "first_bonus",
        date: new Date(user.createdAt).toLocaleDateString("ru-RU"),
        type: "welcome_bonus",
        description: "Р‘РѕРЅСѓСЃ Р·Р° РїРµСЂРІС‹Р№ РІС…РѕРґ",
        stars: 0,
        days: 3,
        status: "active"
      });
    }

    res.json(bonusHistory);
  } catch (error) {
    console.error("вќЊ РћС€РёР±РєР° РїСЂРё РїРѕР»СѓС‡РµРЅРёРё РёСЃС‚РѕСЂРёРё Р±РѕРЅСѓСЃРѕРІ:", error);
    res.status(500).json({ error: "Server error" });
  }
}

export async function getFullHistory(req: any, res: any) {
  const { telegramId } = req.params;

  try {
    console.log("рџ“љ Р—Р°РїСЂРѕСЃ РїРѕР»РЅРѕР№ РёСЃС‚РѕСЂРёРё РґР»СЏ:", telegramId);

    const purchases = await (prisma as any).purchase.findMany({
      where: { userId: telegramId },
      orderBy: { purchasedAt: "desc" }
    });

    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        invitedUsers: {
          where: { bonusGiven: true },
          include: {
            invitedUser: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const wasInvited = await (prisma as any).invitedUser.findUnique({
      where: { invitedUserId: telegramId }
    });

    console.log("рџ”Ќ РРЅС„РѕСЂРјР°С†РёСЏ Рѕ РїРѕР»СЊР·РѕРІР°С‚РµР»Рµ:", {
      telegramId,
      hasClaimedBonus: user.hasClaimedBonus,
      wasInvited: !!wasInvited,
      invitedBy: wasInvited?.referrerId
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
        description: `РџРѕРєСѓРїРєР° ${p.plan === "month" ? "1 РјРµСЃСЏС†Р°" :
                              p.plan === "3months" ? "3 РјРµСЃСЏС†РµРІ" :
                              p.plan === "6months" ? "6 РјРµСЃСЏС†РµРІ" : "1 РіРѕРґР°"}`,
        status: new Date(p.expiresAt) > new Date() ? "active" : "expired"
      });
    });

    if (user.hasClaimedBonus) {
      const bonusDays = wasInvited ? 6 : 3;
      const bonusDate = new Date(user.createdAt);

      const description = wasInvited
        ? `рџЋЃ Р‘РѕРЅСѓСЃ Р·Р° РїРµСЂРІС‹Р№ РІС…РѕРґ + РїСЂРёРіР»Р°С€РµРЅРёРµ (6 РґРЅРµР№)`
        : `рџЋЃ Р‘РѕРЅСѓСЃ Р·Р° РїРµСЂРІС‹Р№ РІС…РѕРґ (3 РґРЅСЏ)`;

      history.push({
        id: "welcome_bonus",
        date: bonusDate.toLocaleDateString("ru-RU"),
        type: "welcome_bonus",
        plan: "bonus",
        stars: 0,
        days: bonusDays,
        description,
        status: "active"
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
        description: `рџ‘Ґ Р‘РѕРЅСѓСЃ Р·Р° РїСЂРёРіР»Р°С€РµРЅРёРµ @${invitedUser?.username || "РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ"}`,
        status: "active"
      });
    });

    history.sort((a, b) => {
      const dateA = a.date.split(".").reverse().join("-");
      const dateB = b.date.split(".").reverse().join("-");
      return dateB.localeCompare(dateA);
    });

    console.log(`вњ… РЎС„РѕСЂРјРёСЂРѕРІР°РЅРѕ ${history.length} Р·Р°РїРёСЃРµР№ РёСЃС‚РѕСЂРёРё`);
    console.log("рџ“Љ Р”РµС‚Р°Р»Рё Р±РѕРЅСѓСЃРѕРІ:", {
      welcomeBonusDays: user.hasClaimedBonus ? (wasInvited ? 6 : 3) : 0,
      wasInvited: !!wasInvited,
      referralBonuses: user.invitedUsers.length
    });

    res.json(history);
  } catch (error) {
    console.error("вќЊ РћС€РёР±РєР° РїСЂРё РїРѕР»СѓС‡РµРЅРёРё РїРѕР»РЅРѕР№ РёСЃС‚РѕСЂРёРё:", error);
    res.status(500).json({ error: "Server error" });
  }
}
