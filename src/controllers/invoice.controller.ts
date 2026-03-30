import axios from "axios";

export async function createInvoice(req: any, res: any) {
  const { userId, plan, stars } = req.body;
  const BOT_TOKEN = process.env.BOT_TOKEN;

  try {
    console.log("📝 Создание инвойса:", { userId, plan, stars });

    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
      {
        title: "AuraVPN Подписка",
        description: `Подписка на ${plan === 'month' ? '1 месяц' : '3 месяца'}`,
        payload: JSON.stringify({ userId, plan, stars }),
        currency: "XTR",
        prices: [{ label: plan === 'month' ? '1 месяц' : '3 месяца', amount: stars }],
      }
    );

    console.log("✅ Инвойс создан:", response.data);

    res.json({ 
      success: true, 
      link: response.data.result 
    });
  } catch (error) {
    console.error("❌ Ошибка создания инвойса:", error);
    res.status(500).json({ 
      success: false, 
      error: "Failed to create invoice" 
    });
  }
}