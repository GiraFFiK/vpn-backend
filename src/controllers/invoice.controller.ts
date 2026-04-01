import axios from "axios";

export async function sendInvoice(req: any, res: any) {
  const { userId, plan } = req.body;
  const BOT_TOKEN = process.env.BOT_TOKEN;

  if (!BOT_TOKEN) {
    console.error("❌ BOT_TOKEN не установлен");
    return res.status(500).json({ success: false, error: "BOT_TOKEN missing" });
  }

  const prices: Record<string, number> = {
    month: 5,      // 5 звезд для теста
    "3months": 10, // 10 звезд для теста
  };

  const titles: Record<string, string> = {
    month: "1 месяц",
    "3months": "3 месяца",
  };

  try {
    console.log("📝 Отправка инвойса пользователю:", userId, "план:", plan);

    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendInvoice`,
      {
        chat_id: userId,
        title: "AuraVPN Подписка",
        description: `Подписка на ${titles[plan] || plan}`,
        payload: JSON.stringify({ userId, plan }),
        provider_token: "",
        currency: "XTR",
        prices: [
          {
            label: titles[plan] || plan,
            amount: prices[plan],
          },
        ],
      }
    );

    console.log("✅ Инвойс отправлен:", response.data.result.message_id);

    res.json({ 
      success: true, 
      message: "Invoice sent to bot chat",
      result: response.data.result 
    });
  } catch (error: any) {
    console.error("❌ Ошибка отправки инвойса:", error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.description || "Failed to send invoice" 
    });
  }
}