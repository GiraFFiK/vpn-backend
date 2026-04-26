import { prisma } from "../prisma";
import { parseTelegramInitData, verifyTelegram } from "../middlewares/telegramAuth";
import crypto from "crypto";

export async function auth(req: any, res: any) {
  const { initData } = req.body;

  try {
    if (!initData || typeof initData !== "string") {
      return res.status(400).json({ error: "Telegram initData is required" });
    }

    const isVerified = verifyTelegram(initData);
    const parsedInitData = parseTelegramInitData(initData);
    const allowUnsafeAuth = process.env.ALLOW_UNSAFE_TELEGRAM_AUTH === "true";

    if ((!isVerified || !parsedInitData?.user?.id) && !allowUnsafeAuth) {
      return res.status(401).json({ error: "Invalid Telegram auth data" });
    }

    let userData = parsedInitData;

    if (!userData && allowUnsafeAuth) {
      try {
        userData = JSON.parse(initData);
      } catch {
        userData = null;
      }
    }

    const telegramUser = userData?.user;
    const userId = telegramUser?.id;
    if (!telegramUser || !userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const username = telegramUser.username || "";
    const firstName = telegramUser.first_name || "User";
    const lastName = telegramUser.last_name || "";
    const photoUrl = telegramUser.photo_url || null;

    // Ищем пользователя
    let dbUser = await prisma.user.findUnique({
      where: { telegramId: String(userId) }
    });

    // Проверяем, был ли пользователь приглашен кем-то
    const invitedBy = dbUser?.invitedBy || null;

    if (!dbUser) {
      // Создаем нового пользователя
      const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      
      dbUser = await prisma.user.create({
        data: {
          telegramId: String(userId),
          username: username,
          firstName: firstName,
          lastName: lastName,
          photoUrl,
          referralCode: referralCode,
          invitedBy: invitedBy
        }
      });

      // Начисляем бонус за первый вход
      console.log("🎁 Вызов handleFirstTimeBonus для нового пользователя:", userId);
      await handleFirstTimeBonus(dbUser.telegramId, invitedBy);
    } else {
      console.log("👤 Пользователь уже существует, проверяем данные...");
      
      // Проверяем, нужно ли обновить данные пользователя
      // (если username начинается с "user_" или firstName "User")
      const needsUpdate = 
        (dbUser.username?.startsWith('user_') && username) ||
        (dbUser.firstName === "User" && firstName !== "User") ||
        (dbUser.lastName === "" && lastName) ||
        (!dbUser.photoUrl && photoUrl);

      if (needsUpdate) {
        console.log("📝 Обновляем данные пользователя...");
        dbUser = await prisma.user.update({
          where: { telegramId: String(userId) },
          data: {
            username: username || dbUser.username,
            firstName: firstName || dbUser.firstName,
            lastName: lastName || dbUser.lastName,
            photoUrl: photoUrl || dbUser.photoUrl
          }
        });
        console.log("✅ Данные обновлены:", { username, firstName, lastName });
      }
      
      // Проверяем, получал ли пользователь бонус
      if (!dbUser.hasClaimedBonus) {
        console.log("🎁 Пользователь не получал бонус, начисляем...");
        await handleFirstTimeBonus(dbUser.telegramId, invitedBy);
      }
    }

    res.json(dbUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}

// Функция для обработки бонуса за первый вход
async function handleFirstTimeBonus(newUserId: string, invitedBy: string | null) {
  try {
    console.log("🎁 ===== НАЧАЛО НАЧИСЛЕНИЯ БОНУСА =====");
    console.log("📨 Данные:", { newUserId, invitedBy });

    const BONUS_DAYS = 3;

    const newUser = await prisma.user.findUnique({
      where: { telegramId: newUserId }
    });

    if (!newUser) {
      console.log("❌ Новый пользователь не найден:", newUserId);
      return;
    }

    let totalBonusDays = BONUS_DAYS;
    console.log("📊 Базовый бонус:", BONUS_DAYS, "дней");

    // Проверяем, был ли пользователь приглашен
    if (invitedBy) {
      console.log("🔍 Пользователь был приглашен, ищем приглашение...");
      
      // Ищем запись о приглашении
      const invite = await (prisma as any).invitedUser.findUnique({
        where: { invitedUserId: newUserId }
      });

      if (invite) {
        console.log("✅ Приглашение найдено:", invite);
        totalBonusDays += 3; // +3 дня за переход по ссылке
        console.log("📊 Добавлен бонус за приглашение: +3 дня");
        console.log("📊 Итоговый бонус:", totalBonusDays, "дней");

        // Обновляем статус приглашения
        console.log("📝 Обновление статуса приглашения...");
        await (prisma as any).invitedUser.update({
          where: { invitedUserId: newUserId },
          data: {
            status: "activated",
            activatedAt: new Date(),
            bonusGiven: true
          }
        });

        // Начисляем бонус пригласившему
        console.log("🔍 Поиск пригласившего:", invite.referrerId);
        const referrer = await prisma.user.findUnique({
          where: { telegramId: invite.referrerId }
        });

        if (referrer) {
          console.log("✅ Пригласивший найден:", referrer.telegramId);
          const referrerCurrentDate = referrer.subscriptionUntil || new Date();
          const referrerNewDate = new Date(referrerCurrentDate.getTime() + (3 * 24 * 60 * 60 * 1000));
          
          await prisma.user.update({
            where: { telegramId: invite.referrerId },
            data: {
              subscriptionUntil: referrerNewDate,
              referralBonus: { increment: 3 }
            }
          });
          console.log("✅ Бонус пригласившему начислен");
        }
      } else {
        console.log("⚠️ Приглашение не найдено в базе для пользователя:", newUserId);
      }
    }

    // Начисляем бонус новому пользователю
    console.log("📝 Начисление бонуса пользователю...");
    const currentDate = newUser.subscriptionUntil || new Date();
    const newDate = new Date(currentDate.getTime() + (totalBonusDays * 24 * 60 * 60 * 1000));
    
    await prisma.user.update({
      where: { telegramId: newUserId },
      data: {
        subscriptionUntil: newDate,
        hasClaimedBonus: true
      }
    });

    console.log(`✅ Бонус начислен: +${totalBonusDays} дней для ${newUserId}`);
    console.log("📅 Новая дата подписки:", newDate);
    console.log("🎁 ===== НАЧИСЛЕНИЕ БОНУСА ЗАВЕРШЕНО =====\n");
  } catch (error) {
    console.error("❌ Ошибка при начислении бонуса:", error);
  }
}
