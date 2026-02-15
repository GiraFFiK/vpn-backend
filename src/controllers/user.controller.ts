import { prisma } from "../prisma";

export async function getUser(req: any, res: any) {
  const { telegramId } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        purchases: true,
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

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}

export async function updateUser(req: any, res: any) {
  const { telegramId } = req.params;
  const { firstName, lastName, photoUrl } = req.body; // ✅ Добавляем lastName

  try {
    const user = await prisma.user.update({
      where: { telegramId },
      data: { 
        firstName: firstName || undefined,
        lastName: lastName || undefined, // ✅ Добавляем lastName
        photoUrl: photoUrl || undefined
      }
    });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
}