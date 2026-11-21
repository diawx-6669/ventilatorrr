import "server-only";
import { env } from "./env";

/** Optional: pings the team chat. Silently does nothing when the bot isn't configured. */
export async function notifyTeam(lines: (string | null | undefined | false)[]) {
  if (!env.telegramToken || !env.telegramChatId) return;
  const text = lines.filter(Boolean).join("\n").slice(0, 3900);
  try {
    const res = await fetch(`https://api.telegram.org/bot${env.telegramToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: env.telegramChatId, text, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.error("telegram", res.status, await res.text().catch(() => ""));
  } catch (e) {
    console.error("telegram", e);
  }
}
