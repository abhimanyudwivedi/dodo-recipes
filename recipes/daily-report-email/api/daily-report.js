// Runs once a day from a Vercel cron (vercel.json). Vercel sends "Authorization: Bearer $CRON_SECRET".
import { db } from "../lib/db.mjs";
import { shouldSend, buildEmail, yesterdayWindow } from "../lib/report.mjs";
import { unsubscribeUrl } from "../lib/unsubscribe.mjs";
import { sendEmail } from "../lib/send.mjs";

export const maxDuration = 60;

export async function GET(request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("unauthorized", { status: 401 });
  const sql = db(), now = new Date(), skipped = [], failed = [];
  let sent = 0;
  const customers = await sql`select * from customer where subscription_status in ('active','cancelled') and paid_through > now()`;
  for (const c of customers) {
    try {
      const { start, end } = yesterdayWindow(c.tz, now);
      const items = await sql`select kind, title, detail, url from activity where customer_id = ${c.id} and created_at >= ${start} and created_at < ${end} order by created_at`;
      const gate = shouldSend(c, items, now);
      if (!gate.send) { skipped.push({ email: c.email, reason: gate.reason }); continue; }
      const unsub = unsubscribeUrl(process.env.APP_URL, c.email, process.env.UNSUBSCRIBE_SECRET);
      const mail = buildEmail({ customer: c, items, product: process.env.PRODUCT_NAME, unsubscribeUrl: unsub });
      await sendEmail({ to: c.email, ...mail, unsubscribeUrl: unsub });
      sent++;
    } catch (e) {
      failed.push({ email: c.email, error: String(e.message ?? e).slice(0, 300) });
    }
  }
  // Record what failed and what was skipped, not just a count: a run that "succeeded" with
  // every send failing looks identical to a good one if you only log totals.
  await sql`insert into report_run (sent, skipped, failed) values (${sent}, ${sql.json(skipped)}, ${sql.json(failed)})`;
  return Response.json({ sent, skipped: skipped.length, failed });
}
