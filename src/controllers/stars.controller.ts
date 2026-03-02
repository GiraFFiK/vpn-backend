import { prisma } from "../prisma";

export async function getStarsBalance(req: any, res: any) {
  const { telegramId } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Здесь нужно получать реальный баланс звезд из Telegram API
    // Пока используем тестовые данные
    // В будущем здесь будет запрос к Telegram API
    
    res.json({
      balance: 150, // Реальный баланс из Telegram
      telegramId: user.telegramId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}

// Эндпоинт для списания звезд (будет вызываться после подтверждения покупки)
export async function deductStars(req: any, res: any) {
  const { telegramId } = req.params;
  const { amount } = req.body;

  try {
    // Здесь должен быть вызов Telegram API для списания звезд
    // TODO: Интеграция с Telegram Stars API
    
    console.log(`✅ Списано ${amount} звезд у пользователя ${telegramId}`);
    
    res.json({
      success: true,
      deducted: amount,
      newBalance: 150 - amount // тестовый новый баланс
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}