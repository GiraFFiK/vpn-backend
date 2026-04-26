import axios from "axios";
import { getSubscriptionPlan } from "../config/subscriptionPlans";

export async function createInvoiceLink(req: any, res: any) {
  const { plan } = req.body;
  const botToken = process.env.BOT_TOKEN;
  const authenticatedTelegramId = req.telegramUserId;

  if (!botToken) {
    console.error("вќЊ BOT_TOKEN РЅРµ СѓСЃС‚Р°РЅРѕРІР»РµРЅ РІ .env");
    return res.status(500).json({
      success: false,
      error: "BOT_TOKEN missing"
    });
  }

  if (!authenticatedTelegramId) {
    return res.status(401).json({
      success: false,
      error: "Missing authenticated Telegram user"
    });
  }

  const subscriptionPlan = getSubscriptionPlan(plan);

  if (!subscriptionPlan || !subscriptionPlan.active) {
    return res.status(400).json({
      success: false,
      error: "Invalid subscription plan"
    });
  }

  try {
    console.log("рџ“ќ РЎРѕР·РґР°РЅРёРµ РёРЅРІРѕР№СЃР°:", {
      userId: authenticatedTelegramId,
      plan: subscriptionPlan.id,
      stars: subscriptionPlan.stars
    });

    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
      {
        title: "AuraVPN РџРѕРґРїРёСЃРєР°",
        description: `РџРѕРґРїРёСЃРєР° РЅР° ${subscriptionPlan.title}`,
        payload: JSON.stringify({
          userId: authenticatedTelegramId,
          plan: subscriptionPlan.id,
          stars: subscriptionPlan.stars
        }),
        provider_token: "",
        currency: "XTR",
        prices: [{ label: subscriptionPlan.title, amount: subscriptionPlan.stars }]
      }
    );

    const invoiceLink = response.data.result;
    console.log("вњ… РРЅРІРѕР№СЃ СЃРѕР·РґР°РЅ, СЃСЃС‹Р»РєР°:", invoiceLink);

    res.json({
      success: true,
      invoiceLink
    });
  } catch (error: any) {
    console.error("вќЊ РћС€РёР±РєР° СЃРѕР·РґР°РЅРёСЏ РёРЅРІРѕР№СЃР°:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.description || "Failed to create invoice link"
    });
  }
}
