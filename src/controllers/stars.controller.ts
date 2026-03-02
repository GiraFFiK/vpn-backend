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

    res.json({
      balance: user.starsBalance || 0,
      telegramId: user.telegramId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}

// Эндпоинт для обновления баланса (например, после пополнения через бота)
export async function updateStarsBalance(req: any, res: any) {
  const { telegramId } = req.params;
  const { amount } = req.body; // amount может быть положительным (пополнение) или отрицательным (списание)

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updatedUser = await prisma.user.update({
      where: { telegramId },
      data: {
        starsBalance: {
          increment: amount
        }
      }
    });

    console.log(`💰 Баланс пользователя ${telegramId} изменен на ${amount}. Новый баланс: ${updatedUser.starsBalance}`);

    res.json({
      success: true,
      newBalance: updatedUser.starsBalance
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}