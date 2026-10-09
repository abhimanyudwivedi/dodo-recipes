import { test } from "node:test";
import assert from "node:assert/strict";
import { Webhook } from "standardwebhooks";
import { classify, money } from "../lib/events.mjs";
import { schedule, render, SEQUENCE } from "../lib/onboarding.mjs";

const sub = (type, extra = {}) => ({ type, data: { subscription_id: "sub_1", customer: { email: "Ana@X.com", name: "Ana Diaz", customer_id: "cus_1" },
  recurring_pre_tax_amount: 5000, currency: "USD", payment_frequency_interval: "Month", billing: { country: "US" }, ...extra } });

test("first payment is a new customer: alert with plan and country, start onboarding", () => {
  const c = classify(sub("subscription.active"), null);
  assert.equal(c.kind, "new");
  assert.equal(c.alert, "New customer: Ana Diaz from US, $50.00/month.");
  assert.equal(c.onboarding, "start");
});
test("a returning customer is not 'new' and does not restart onboarding", () => {
  const c = classify(sub("subscription.active"), { first_paid_at: new Date("2026-09-01") });
  assert.equal(c.kind, "reactivated");
  assert.equal(c.onboarding, null);
});
test("renewals stay quiet", () => assert.equal(classify(sub("subscription.renewed"), { first_paid_at: new Date() }).alert, null));
test("a cancellation carries the reason the customer gave, and stops onboarding", () => {
  const c = classify(sub("subscription.cancelled", { cancellation_feedback: "too_expensive", cancellation_comment: "Need it only during tax season" }), {});
  assert.match(c.alert, /Reason they gave: "too_expensive: Need it only during tax season"/);
  assert.equal(c.onboarding, "stop");
});
test("a cancellation with no reason prompts you to ask", () => assert.match(classify(sub("subscription.cancelled"), {}).alert, /ask them/));
test("failed payments alert you while there is time to help", () => {
  for (const t of ["subscription.on_hold", "subscription.past_due", "subscription.failed"]) assert.equal(classify(sub(t), {}).kind, "payment_failed");
});
test("unknown events are ignored", () => assert.equal(classify({ type: "payment.succeeded", data: {} }, null).kind, "ignored"));
test("money reads Dodo's smallest-unit amounts", () => {
  assert.equal(money(5000, "USD", "Month"), "$50.00/month");
  assert.equal(money(55000, "USD", "Year"), "$550.00/year");
  assert.equal(money(null, "USD"), "");
});
test("onboarding is scheduled at day offsets and every step renders", () => {
  const start = new Date("2026-10-13T10:00:00Z");
  const rows = schedule("ana@x.com", start);
  assert.deepEqual(rows.map((r) => (r.send_at - start) / 864e5), SEQUENCE.map((s) => s.day));
  for (const s of SEQUENCE) {
    const m = render(s.step, { first: "Ana", product: "Acme", founder: "Sam", first_action: "x", first_result: "y" });
    assert.ok(!/\{\w+\}/.test(m.subject + m.text), `unfilled placeholder in ${s.step}`);
  }
});
test("only a correctly signed Dodo webhook verifies", () => {
  const key = "whsec_" + Buffer.from("test-secret-test-secret-123456").toString("base64");
  const wh = new Webhook(key), id = "msg_2", ts = new Date(), body = JSON.stringify(sub("subscription.active"));
  const h = { "webhook-id": id, "webhook-timestamp": String(Math.floor(ts / 1000)), "webhook-signature": wh.sign(id, ts, body) };
  assert.equal(wh.verify(body, h).type, "subscription.active");
  assert.throws(() => wh.verify(body, { ...h, "webhook-id": "msg_3" }));
});
