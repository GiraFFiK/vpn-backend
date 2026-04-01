import axios from "axios";

export async function createInvoiceLink(req: any, res: any) {
  const { userId, plan, stars } = req.body;
  const BOT_TOKEN = process.env.BOT_TOKEN;

  try {
    console.log("📝 Создание инвойса:", { userId, plan, stars });

    // Формируем описание в зависимости от плана
    const planText = plan === 'month' ? '1 месяц' : 
                     plan === '3months' ? '3 месяца' : 
                     plan === '6months' ? '6 месяцев' : '1 год';
    
    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
      {
        title: "AuraVPN Подписка",
        description: `Подписка на ${planText}`,
        payload: JSON.stringify({ userId, plan, stars }),
        currency: "XTR",
        prices: [{ label: planText, amount: stars }],
      }
    );

    console.log("✅ Инвойс создан, ссылка:", response.data.result);

    res.json({ 
      success: true, 
      invoiceLink: response.data.result 
    });
  } catch (error: any) {
    console.error("❌ Ошибка создания инвойса:", error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: "Failed to create invoice link" 
    });
  }
}