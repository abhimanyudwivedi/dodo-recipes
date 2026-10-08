// Dodo Payments webhook: keeps each customer's subscription status and paid-through date current.
// Dodo signs webhooks with the Standard Webhooks scheme (webhook-id, webhook-timestamp, webhook-signature).
import { Webhook } from "standardwebhooks";
import { db } from "../lib/db.mjs";
import { subscriptionUpdate } from "../lib/dodo.mjs";

export async function POST(request) {
  const body = await request.text(); // raw body: the signature is over the exact bytes
  let event;
  try {
    event = new Webhook(process.env.DODO_WEBHOOK_KEY).verify(body, {
      "webhook-id": request.headers.get("webhook-id") ?? "",
      "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
      "webhook-signature": request.headers.get("webhook-signature") ?? "",
    });
  } catch {
    return new Response("invalid signature", { status: 400 });
  }
  const u = subscriptionUpdate(event);
  if (!u) return Response.json({ received: true, ignored: event.type });
  const sql = db();
  if (u.email) {
    await sql`insert into customer (email, name, dodo_subscription_id, subscription_status, paid_through)
      values (${u.email}, ${u.name}, ${u.subscriptionId}, ${u.status}, ${u.paidThrough})
      on conflict (email) do update set dodo_subscription_id = excluded.dodo_subscription_id,
        subscription_status = excluded.subscription_status,
        paid_through = coalesce(excluded.paid_through, customer.paid_through)`;
  } else {
    await sql`update customer set subscription_status = ${u.status}, paid_through = coalesce(${u.paidThrough}, paid_through)
      where dodo_subscription_id = ${u.subscriptionId}`;
  }
  return Response.json({ received: true, status: u.status });
}
