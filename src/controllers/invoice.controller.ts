import axios from "axios";
import { getPurchasableSubscriptionPlan } from "../config/subscriptionPlans";

export async function createInvoiceLink(req: any, res: any) {
  const { planId, period } = req.body;
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

  const subscription = getPurchasableSubscriptionPlan(planId, period);

  if (!subscription) {
    return res.status(403).json({
      success: false,
      error: "This subscription plan is not available",
    });
  }

  try {
    console.log("Creating invoice:", {
      userId: authenticatedTelegramId,
      plan: subscription.plan.id,
      period: subscription.period,
      stars: subscription.stars,
      deviceLimit: subscription.plan.deviceLimit,
    });

    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
      {
        title: "AuraVPN Подписка",
        description: `AuraVPN: ${subscription.plan.title}`,
        payload: JSON.stringify({
          userId: authenticatedTelegramId,
          planId: subscription.plan.id,
          period: subscription.period,
          priceStars: subscription.stars,
          deviceLimit: subscription.plan.deviceLimit,
        }),
        provider_token: "",
        currency: "XTR",
        prices: [
          { label: subscription.plan.title, amount: subscription.stars },
        ],
      },
    );

    const invoiceLink = response.data.result;
    console.log("Invoice link created:", invoiceLink);

    res.json({
      success: true,
      invoiceLink,
      deviceLimit: subscription.plan.deviceLimit,
    });
  } catch (error: any) {
    console.error(
      "Invoice creation failed:",
      error.response?.data || error.message,
    );
    res.status(500).json({
      success: false,
      error:
        error.response?.data?.description || "Failed to create invoice link",
    });
  }
}
