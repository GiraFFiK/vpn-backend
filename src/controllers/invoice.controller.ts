import axios from "axios";
import { getSubscriptionPlan } from "../config/subscriptionPlans";

export async function createInvoiceLink(req: any, res: any) {
  const { plan } = req.body;
  const botToken = process.env.BOT_TOKEN;
  const authenticatedTelegramId = req.telegramUserId;

  if (!botToken) {
    console.error("BOT_TOKEN is missing in environment variables");
    return res.status(500).json({
      success: false,
      error: "BOT_TOKEN missing",
    });
  }

  if (!authenticatedTelegramId) {
    return res.status(401).json({
      success: false,
      error: "Missing authenticated Telegram user",
    });
  }

  const subscriptionPlan = getSubscriptionPlan(plan);

  if (!subscriptionPlan || !subscriptionPlan.active) {
    return res.status(400).json({
      success: false,
      error: "Invalid subscription plan",
    });
  }

  try {
    console.log("Creating invoice:", {
      userId: authenticatedTelegramId,
      plan: subscriptionPlan.id,
      stars: subscriptionPlan.stars,
    });

    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
      {
        title: "AuraVPN Подписка",
        description: `Подписка на ${subscriptionPlan.title}`,
        payload: JSON.stringify({
          userId: authenticatedTelegramId,
          plan: subscriptionPlan.id,
          stars: subscriptionPlan.stars,
        }),
        provider_token: "",
        currency: "XTR",
        prices: [{ label: subscriptionPlan.title, amount: subscriptionPlan.stars }],
      }
    );

    const invoiceLink = response.data.result;
    console.log("Invoice link created:", invoiceLink);

    res.json({
      success: true,
      invoiceLink,
    });
  } catch (error: any) {
    console.error("Invoice creation failed:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.description || "Failed to create invoice link",
    });
  }
}
