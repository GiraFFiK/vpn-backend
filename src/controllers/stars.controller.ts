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

    // Возвращаем просто информацию, что баланс не отслеживается
    res.json({
      balance: null,
      message: "Баланс звезд управляется Telegram",
      telegramId: user.telegramId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}

// Эндпоинт для обновления баланса (оставляем для совместимости, но не используем)
export async function updateStarsBalance(req: any, res: any) {
  res.json({
    success: true,
    message: "Баланс звезд управляется Telegram"
  });
}