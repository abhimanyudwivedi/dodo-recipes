import { test } from "node:test";
import assert from "node:assert/strict";
import { isPaying, shouldSend, buildEmail, yesterdayWindow } from "../lib/report.mjs";
import { subscriptionUpdate } from "../lib/dodo.mjs";
import { unsubscribeUrl, verifyUnsubscribe } from "../lib/unsubscribe.mjs";
import { Webhook } from "standardwebhooks";

const now = new Date("2026-10-13T13:00:00Z");
const paying = { email: "a@x.com", name: "Ana Diaz", subscription_status: "active", paid_through: "2026-11-01T00:00:00Z" };

test("cancelled but paid through a future date still counts as paying", () => {
  assert.equal(isPaying({ ...paying, subscription_status: "cancelled" }, now), true);
  assert.equal(isPaying({ ...paying, paid_through: "2026-10-01T00:00:00Z" }, now), false);
  assert.equal(isPaying({ ...paying, subscription_status: "on_hold" }, now), false);
});
test("no email when nothing was done, even if there were skips", () => {
  assert.deepEqual(shouldSend(paying, [{ kind: "skipped", title: "x" }], now), { send: false, reason: "nothing done yesterday" });
  assert.equal(shouldSend(paying, [{ kind: "done", title: "x" }], now).send, true);
  assert.equal(shouldSend({ ...paying, unsubscribed_at: now }, [{ kind: "done", title: "x" }], now).reason, "unsubscribed");
});
test("the count in the subject is counted from the rows, and HTML is escaped", () => {
  const items = [{ kind: "done", title: "Shipped <b>2</b> posts" }, { kind: "done", title: "b" }, { kind: "skipped", title: "c" }];
  const m = buildEmail({ customer: paying, items, product: "Acme", unsubscribeUrl: "https://a/u" });
  assert.equal(m.subject, "2 done for you yesterday");
  assert.match(m.html, /Shipped &lt;b&gt;2&lt;\/b&gt; posts/);
  assert.match(m.html, /Hi Ana,/);
  assert.match(m.text, /Stop these emails: https:\/\/a\/u/);
});
test("yesterday is the customer's own calendar day", () => {
  const { start, end } = yesterdayWindow("America/New_York", now); // 09:00 New York, 13 Oct
  assert.equal(start.toISOString(), "2026-10-12T04:00:00.000Z");
  assert.equal(end.toISOString(), "2026-10-13T04:00:00.000Z");
  const k = yesterdayWindow("Asia/Kolkata", now);                  // 18:30 India, 13 Oct
  assert.equal(k.start.toISOString(), "2026-10-11T18:30:00.000Z");
});
test("Dodo events map to the right status; payments are ignored", () => {
  const ev = (type) => ({ type, data: { subscription_id: "sub_1", customer: { email: "A@X.com" }, next_billing_date: "2026-11-13" } });
  assert.equal(subscriptionUpdate(ev("subscription.active")).status, "active");
  assert.equal(subscriptionUpdate(ev("subscription.on_hold")).status, "on_hold");
  assert.equal(subscriptionUpdate(ev("subscription.cancelled")).status, "cancelled");
  assert.equal(subscriptionUpdate(ev("subscription.active")).email, "a@x.com");
  assert.equal(subscriptionUpdate(ev("payment.succeeded")), null);
});
test("a webhook signed with the right key verifies; a tampered body does not", () => {
  const key = "whsec_" + Buffer.from("test-secret-test-secret-123456").toString("base64");
  const wh = new Webhook(key), id = "msg_1", ts = new Date();
  const body = JSON.stringify({ type: "subscription.active", data: { subscription_id: "sub_1" } });
  const sig = wh.sign(id, ts, body);
  const h = { "webhook-id": id, "webhook-timestamp": String(Math.floor(ts / 1000)), "webhook-signature": sig };
  assert.equal(wh.verify(body, h).type, "subscription.active");
  assert.throws(() => wh.verify(body.replace("sub_1", "sub_2"), h));
});
test("unsubscribe links can't be forged for another address", () => {
  const u = new URL(unsubscribeUrl("https://app", "Ana@X.com", "s3cret"));
  assert.equal(verifyUnsubscribe(u.searchParams.get("e"), u.searchParams.get("t"), "s3cret"), true);
  assert.equal(verifyUnsubscribe("bob@x.com", u.searchParams.get("t"), "s3cret"), false);
});
