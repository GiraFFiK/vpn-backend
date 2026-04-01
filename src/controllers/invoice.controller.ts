import axios from "axios";

export async function createInvoiceLink(req: any, res: any) {
  const { userId, plan, stars } = req.body;
  const BOT_TOKEN = process.env.BOT_TOKEN;

  if (!BOT_TOKEN) {
    console.error("❌ BOT_TOKEN не установлен в .env");
    return res.status(500).json({ 
      success: false, 
      error: "BOT_TOKEN missing" 
    });
  }

  const prices: Record<string, number> = {
    month: 5,
    "3months": 10,
  };

  const titles: Record<string, string> = {
    month: "1 месяц",
    "3months": "3 месяца",
  };

  try {
    console.log("📝 Создание инвойса:", { userId, plan, stars });

    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
      {
        title: "AuraVPN Подписка",
        description: `Подписка на ${titles[plan] || plan}`,
        payload: JSON.stringify({ userId, plan, stars }),
        provider_token: "",
        currency: "XTR",
        prices: [{ label: titles[plan] || plan, amount: stars }],
      }
    );

    const invoiceLink = response.data.result;
    console.log("✅ Инвойс создан, ссылка:", invoiceLink);

    res.json({ 
      success: true, 
      invoiceLink: invoiceLink 
    });
  } catch (error: any) {
    console.error("❌ Ошибка создания инвойса:", error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.description || "Failed to create invoice link" 
    });
  }
}