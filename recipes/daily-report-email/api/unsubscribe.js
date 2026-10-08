import { db } from "../lib/db.mjs";
import { verifyUnsubscribe } from "../lib/unsubscribe.mjs";

async function handle(request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("e"), token = url.searchParams.get("t");
  if (!verifyUnsubscribe(email, token, process.env.UNSUBSCRIBE_SECRET)) return new Response("This link is not valid.", { status: 400 });
  await db()`update customer set unsubscribed_at = now() where email = ${email} and unsubscribed_at is null`;
  return new Response("Done. You won't get these emails any more.", { headers: { "content-type": "text/plain; charset=utf-8" } });
}
export const GET = handle;   // the link in the email
export const POST = handle;  // one-click unsubscribe from Gmail / Apple Mail (List-Unsubscribe-Post)
