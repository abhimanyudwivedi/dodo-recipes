// Vercel serverless function: GET /api/send-due, called every 5 minutes by a free cron pinger
// (cron-job.org) during the send window only. Sends what is due, one at a time.
import { db } from "../lib/db.mjs";
import { mailer } from "../lib/mail.mjs";
import { decide, fromExactly } from "../lib/checks.mjs";

export const config = { maxDuration: 60 };
const PER_RUN = 6; // small batches: each send is checked and spaced, and a run stays well inside 60 s

export default async function handler(req, res) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ error: "unauthorized" });
  const sql = db(), mail = mailer(), now = new Date(), log = [];

  const due = await sql`select * from outreach_email where status = 'queued' and send_at <= ${now} order by send_at limit ${PER_RUN}`;
  for (const row of due) {
    // Claim the row first, so two overlapping runs can never send it twice.
    const [claimed] = await sql`update outreach_email set status = 'sending' where id = ${row.id} and status = 'queued' returning id`;
    if (!claimed) continue;
    try {
      const [blk] = await sql`select reason from do_not_email where email = lower(${row.to_email})`;
      const repliedInMailbox = fromExactly(await mail.messagesFrom(row.to_email), row.to_email);
      const d = decide(row, { now, blocked: blk?.reason ?? null, repliedInMailbox });
      if (d.action !== "send") {
        await sql`update outreach_email set status = ${d.action === "missed" ? "missed" : "skipped"}, detail = ${d.reason} where id = ${row.id}`;
        if (d.reason === "replied") await sql`insert into do_not_email (email, reason) values (lower(${row.to_email}), 'replied') on conflict do nothing`;
        log.push({ to: row.to_email, ...d });
        continue;
      }
      await (row.kind === "followup" ? mail.reply : mail.send)({ to: row.to_email, subject: row.subject, body: row.body });
      // Marked sent only after the provider accepted it.
      await sql`update outreach_email set status = 'sent', sent_at = now() where id = ${row.id}`;
      log.push({ to: row.to_email, action: "sent" });
    } catch (e) {
      await sql`update outreach_email set status = 'error', detail = ${String(e.message ?? e).slice(0, 300)} where id = ${row.id}`;
      log.push({ to: row.to_email, action: "error", reason: String(e.message ?? e) });
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  res.status(200).json({ checked: due.length, log });
}
