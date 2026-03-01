import { prisma } from "../prisma";
import { verifyTelegram } from "../middlewares/telegramAuth";
import crypto from "crypto";

export async function auth(req: any, res: any) {
  const { initData } = req.body;

  if (!initData || !verifyTelegram(initData)) {
    return res.status(401).json({ error: "Invalid telegram auth" });
  }

  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get("user")!);

  try {
    let dbUser = await prisma.user.findUnique({
      where: { telegramId: String(user.id) }
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          telegramId: String(user.id),
          username: user.username || null,
          firstName: user.first_name || null,
          lastName: user.last_name || null, // ✅ lastName теперь есть в схеме
          referralCode: crypto.randomBytes(4).toString('hex').toUpperCase()
        }
      });
    }

    res.json(dbUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
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