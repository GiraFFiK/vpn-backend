import { prisma } from "../prisma";
import crypto from "crypto"; // Добавьте импорт в начало файла

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
      const referralCode = crypto.randomBytes(4).toString('hex').toUpperCase();
      
      newUser = await prisma.user.create({
        data: {
          telegramId: newUserId,
          referralCode: referralCode,
          username: `user_${newUserId}`, // временное имя
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