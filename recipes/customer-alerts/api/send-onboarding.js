// Daily Vercel cron: sends onboarding emails that are due, unless the customer has left or opted out.
import { db } from "../lib/db.mjs";
import { render } from "../lib/onboarding.mjs";
import { sendEmail } from "../lib/mail.mjs";

export const maxDuration = 60;

export async function GET(request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("unauthorized", { status: 401 });
  const sql = db(), log = [];
  const due = await sql`select o.*, c.name, c.status as customer_status, c.unsubscribed_at from onboarding_email o join customer c using (email)
    where o.status = 'queued' and o.send_at <= now() order by o.send_at limit 50`;
  for (const row of due) {
    if (row.unsubscribed_at || ["cancelled", "expired"].includes(row.customer_status)) {
      await sql`update onboarding_email set status = 'skipped', detail = ${row.unsubscribed_at ? "unsubscribed" : row.customer_status} where id = ${row.id}`;
      log.push({ email: row.email, step: row.step, skipped: true });
      continue;
    }
    try {
      const vars = { first: (row.name ?? "").split(" ")[0] || "there", product: process.env.PRODUCT_NAME, founder: process.env.FOUNDER_NAME,
        first_action: process.env.FIRST_ACTION, first_result: process.env.FIRST_RESULT };
      await sendEmail({ to: row.email, ...render(row.step, vars) });
      await sql`update onboarding_email set status = 'sent', sent_at = now() where id = ${row.id}`;
      log.push({ email: row.email, step: row.step, sent: true });
    } catch (e) {
      await sql`update onboarding_email set status = 'error', detail = ${String(e.message ?? e).slice(0, 300)} where id = ${row.id}`;
      log.push({ email: row.email, step: row.step, error: String(e.message ?? e) });
    }
  }
  return Response.json({ due: due.length, log });
}
