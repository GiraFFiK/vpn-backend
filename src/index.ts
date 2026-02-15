import app from "./app";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  console.log("✅ Prisma connected");

  // Убираем тестовое создание пользователя, так как оно вызывает ошибки
}

main().catch((error) => {
  console.error("❌ Prisma connection error:", error);
  process.exit(1);
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});