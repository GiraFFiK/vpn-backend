import { prisma } from "../prisma";
import { verifyTelegram } from "../middlewares/telegramAuth";
import crypto from "crypto";

export async function auth(req: any, res: any) {
  const { initData } = req.body;

  try {
    let userData;
    try {
      userData = JSON.parse(initData);
    } catch {
      userData = { user: initData };
    }

    const userId = userData.user?.id || userData.id;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const username = userData.user?.username || userData.username || "user";
    const firstName = userData.user?.first_name || userData.first_name || "User";
    const lastName = userData.user?.last_name || userData.last_name || "";

    // Ищем пользователя
    let dbUser = await prisma.user.findUnique({
      where: { telegramId: String(userId) }
    });

    // Проверяем, был ли пользователь приглашен кем-то
    // (эта информация может быть в initData или отдельном параметре)
    const invitedBy = userData.invitedBy || null;

    if (!dbUser) {
      // Создаем нового пользователя
      const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      
      dbUser = await prisma.user.create({
        data: {
          telegramId: String(userId),
          username: username,
          firstName: firstName,
          lastName: lastName,
          referralCode: referralCode,
          invitedBy: invitedBy
        }
      });

      // Начисляем бонус за первый вход
      await handleFirstTimeBonus(dbUser.telegramId, invitedBy);
    }

    res.json(dbUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}

// Функция для обработки бонуса за первый вход
async function handleFirstTimeBonus(newUserId: string, invitedBy: number | null) {
  try {
    const BONUS_DAYS = 3; // Базовый бонус за первый вход

    // Начисляем бонус новому пользователю
    const newUser = await prisma.user.findUnique({
      where: { telegramId: newUserId }
    });

    if (!newUser) return;

    let totalBonusDays = BONUS_DAYS;

    // Если пользователь был приглашен, добавляем дополнительный бонус
    if (invitedBy) {
      totalBonusDays += 3; // +3 дня за переход по ссылке

      // Начисляем бонус пригласившему
      const referrer = await prisma.user.findUnique({
        where: { telegramId: String(invitedBy) }
      });

      if (referrer) {
        const referrerCurrentDate = referrer.subscriptionUntil || new Date();
        const referrerNewDate = new Date(referrerCurrentDate.getTime() + (3 * 24 * 60 * 60 * 1000));
        
        await prisma.user.update({
          where: { telegramId: String(invitedBy) },
          data: {
            subscriptionUntil: referrerNewDate,
            referralBonus: { increment: 3 }
          }
        });

        // Создаем запись о приглашении
        await (prisma as any).invitedUser.create({
          data: {
            referrerId: String(invitedBy),
            invitedUserId: newUserId,
            status: "activated",
            bonusGiven: true,
            activatedAt: new Date()
          }
        });

        console.log(`✅ Пригласивший ${invitedBy} получил +3 дня за приглашение ${newUserId}`);
      }
    }

    // Начисляем бонус новому пользователю
    const currentDate = newUser.subscriptionUntil || new Date();
    const newDate = new Date(currentDate.getTime() + (totalBonusDays * 24 * 60 * 60 * 1000));
    
    await prisma.user.update({
      where: { telegramId: newUserId },
      data: {
        subscriptionUntil: newDate,
        hasClaimedBonus: true
      }
    });

    console.log(`✅ Новый пользователь ${newUserId} получил ${totalBonusDays} дней бонуса`);
  } catch (error) {
    console.error("Ошибка при начислении бонуса:", error);
  }
}

// export async function auth(req: any, res: any) {
//   const { initData } = req.body;

//   // ВРЕМЕННО - пропускаем проверку
//   // if (!initData || !verifyTelegram(initData)) {
//   //   return res.status(401).json({ error: "Invalid telegram auth" });
//   // }

//   try {
//     let userData;
//     try {
//       // Пробуем распарсить как JSON
//       userData = JSON.parse(initData);
//     } catch {
//       // Если не получается, используем как есть
//       userData = { user: initData };
//     }

//     const userId = userData.user?.id || userData.id || 12345;
//     const username = userData.user?.username || userData.username || "test";
//     const firstName = userData.user?.first_name || userData.first_name || "Test";
//     const lastName = userData.user?.last_name || userData.last_name || "";

//     let dbUser = await prisma.user.findUnique({
//       where: { telegramId: String(userId) }
//     });

//     if (!dbUser) {
//       dbUser = await prisma.user.create({
//         data: {
//           telegramId: String(userId),
//           username: username,
//           firstName: firstName,
//           lastName: lastName,
//           referralCode: crypto.randomBytes(4).toString('hex').toUpperCase()
//         }
//       });
//     }

//     res.json(dbUser);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Server error" });
//   }
// }