// Send an alert to wherever you'll see it: Slack, Discord or Telegram. Set one or more URLs in env.
// Every channel that is set gets the message; a failure on one never blocks the others.
export async function notify(text) {
  const jobs = [];
  if (process.env.SLACK_WEBHOOK_URL) jobs.push(post(process.env.SLACK_WEBHOOK_URL, { text }));
  if (process.env.DISCORD_WEBHOOK_URL) jobs.push(post(process.env.DISCORD_WEBHOOK_URL, { content: text }));
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
    jobs.push(post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, { chat_id: process.env.TELEGRAM_CHAT_ID, text }));
  const results = await Promise.allSettled(jobs);
  return results.map((r) => (r.status === "fulfilled" ? "ok" : String(r.reason?.message ?? r.reason)));
}
async function post(url, body) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
}
