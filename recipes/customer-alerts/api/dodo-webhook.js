// Dodo Payments webhook: alerts the founder and starts or stops onboarding.
import { Webhook } from "standardwebhooks";
import { db } from "../lib/db.mjs";
import { classify } from "../lib/events.mjs";
import { schedule } from "../lib/onboarding.mjs";
import { notify } from "../lib/notify.mjs";

export async function POST(request) {
  const body = await request.text();
  const headers = { "webhook-id": request.headers.get("webhook-id") ?? "", "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "", "webhook-signature": request.headers.get("webhook-signature") ?? "" };
  let event;
  try { event = new Webhook(process.env.DODO_WEBHOOK_KEY).verify(body, headers); }
  catch { return new Response("invalid signature", { status: 400 }); }

  const sql = db();
  // Dodo retries deliveries; handle each webhook id once.
  const [fresh] = await sql`insert into webhook_event (id, type) values (${headers["webhook-id"]}, ${event.type}) on conflict do nothing returning id`;
  if (!fresh) return Response.json({ received: true, duplicate: true });

  const d = event.data ?? {};
  const email = d.customer?.email?.toLowerCase();
  if (!email || !event.type?.startsWith("subscription.")) return Response.json({ received: true, ignored: event.type });

  const [known] = await sql`select * from customer where email = ${email}`;
  const c = classify(event, known ?? null);
  if (c.kind === "ignored") return Response.json({ received: true, ignored: event.type });

  await sql`insert into customer (email, name, dodo_customer_id, subscription_id, status, first_paid_at, cancelled_at)
    values (${email}, ${d.customer?.name ?? null}, ${d.customer?.customer_id ?? null}, ${d.subscription_id ?? null}, ${c.status},
            ${c.kind === "new" ? new Date() : null}, ${c.kind === "cancelled" ? new Date() : null})
    on conflict (email) do update set status = excluded.status, subscription_id = coalesce(excluded.subscription_id, customer.subscription_id),
      first_paid_at = coalesce(customer.first_paid_at, excluded.first_paid_at), cancelled_at = coalesce(excluded.cancelled_at, customer.cancelled_at)`;

  if (c.onboarding === "start") {
    for (const r of schedule(email, new Date()))
      await sql`insert into onboarding_email (email, step, send_at) values (${r.email}, ${r.step}, ${r.send_at}) on conflict do nothing`;
  }
  if (c.onboarding === "stop") await sql`update onboarding_email set status = 'skipped', detail = ${c.kind} where email = ${email} and status = 'queued'`;

  const sent = c.alert ? await notify(c.alert) : [];
  return Response.json({ received: true, kind: c.kind, alerted: sent });
}
