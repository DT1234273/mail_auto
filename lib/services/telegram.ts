export async function sendTelegramNotification(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  // Fallback to console log if token missing or you need a default chat ID (requires setup).
  // For safety, we will just simulate if no chat ID is known. Usually, bots need to know the target CHAT_ID.
  // Assuming a hypothetical 'TELEGRAM_CHAT_ID' is in process.env or we broadcast to a known user id.
  const chatId = process.env.TELEGRAM_CHAT_ID; 

  if (!token) {
    console.warn("TELEGRAM_BOT_TOKEN not set. Console logging notification:");
    console.log("TELEGRAM:", message);
    return;
  }

  if (!chatId) {
    console.warn("TELEGRAM_CHAT_ID not set. Check updates to get your ID.");
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      }),
    });

    if (!response.ok) {
      console.error("Telegram API Error:", await response.text());
    }
  } catch (err) {
    console.error("Failed to send telegram message:", err);
  }
}
