import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";

const TELEGRAM_AUTH_MAX_AGE_SECONDS = 24 * 60 * 60;

function getTelegramSecret() {
  const botToken = process.env.BOT_TOKEN;

  if (!botToken) {
    throw new Error("BOT_TOKEN is required for Telegram auth verification");
  }

  return crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
}

function isUnsafeTelegramAuthAllowed() {
  return process.env.ALLOW_UNSAFE_TELEGRAM_AUTH === "true";
}

export function parseTelegramInitData(initData: string) {
  const params = new URLSearchParams(initData);
  const rawUser = params.get("user");
  const authDate = params.get("auth_date");

  if (!rawUser || !authDate) {
    return null;
  }

  try {
    return {
      authDate: Number(authDate),
      user: JSON.parse(rawUser) as {
        id?: number;
        username?: string;
        first_name?: string;
        last_name?: string;
        photo_url?: string;
      },
    };
  } catch {
    return null;
  }
}

export function verifyTelegram(initData: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");

  if (!hash) {
    return false;
  }

  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const expectedHash = crypto
    .createHmac("sha256", getTelegramSecret())
    .update(dataCheckString)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedHash, "hex");
  const receivedBuffer = Buffer.from(hash, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function requireTelegramAuth(req: Request, res: Response, next: NextFunction) {
  const initDataHeader = req.header("X-Telegram-Init-Data");

  if (!initDataHeader) {
    return res.status(401).json({ error: "Missing Telegram auth data" });
  }

  const parsed = parseTelegramInitData(initDataHeader);

  if (!parsed?.user?.id) {
    return res.status(401).json({ error: "Invalid Telegram auth payload" });
  }

  const isVerified = verifyTelegram(initDataHeader);
  const authAgeSeconds = Math.floor(Date.now() / 1000) - parsed.authDate;
  const isFresh = authAgeSeconds >= 0 && authAgeSeconds <= TELEGRAM_AUTH_MAX_AGE_SECONDS;

  if ((!isVerified || !isFresh) && !isUnsafeTelegramAuthAllowed()) {
    return res.status(401).json({ error: "Telegram auth verification failed" });
  }

  req.telegramUserId = String(parsed.user.id);
  req.telegramInitData = initDataHeader;

  next();
}

export function requireTelegramUserMatch(paramName = "telegramId") {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.telegramUserId) {
      return res.status(401).json({ error: "Missing authenticated Telegram user" });
    }

    const routeTelegramId = req.params[paramName];

    if (!routeTelegramId || routeTelegramId !== req.telegramUserId) {
      return res.status(403).json({ error: "Forbidden for this Telegram user" });
    }

    next();
  };
}

export function requireInternalBotAuth(req: Request, res: Response, next: NextFunction) {
  const botToken = process.env.BOT_TOKEN;
  const internalToken = req.header("X-Internal-Bot-Token");

  if (!botToken || !internalToken || internalToken !== botToken) {
    return res.status(401).json({ error: "Unauthorized internal bot request" });
  }

  next();
}

export function requireTelegramAuthOrInternalBot(req: Request, res: Response, next: NextFunction) {
  const botToken = process.env.BOT_TOKEN;
  const internalToken = req.header("X-Internal-Bot-Token");

  if (botToken && internalToken && internalToken === botToken) {
    const routeTelegramId =
      typeof req.params.telegramId === "string" ? req.params.telegramId : undefined;
    req.telegramUserId = routeTelegramId || req.telegramUserId;
    return next();
  }

  return requireTelegramAuth(req, res, next);
}
