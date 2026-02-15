import app from '../src/app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Для Vercel serverless
export default async function handler(req: any, res: any) {
  // Подключаемся к БД при каждом запросе (для SQLite это особенность)
  await prisma.$connect();
  
  // Запускаем приложение
  return app(req, res);
}