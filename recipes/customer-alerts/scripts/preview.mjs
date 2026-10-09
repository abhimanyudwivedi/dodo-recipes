// Prints the alert each kind of event produces, so you can tune the wording before connecting anything.
import { classify } from "../lib/events.mjs";
const base = { subscription_id: "sub_1", customer: { email: "ana@x.com", name: "Ana Diaz" }, recurring_pre_tax_amount: 5000, currency: "USD", payment_frequency_interval: "Month", billing: { country: "US" } };
for (const [type, known, extra] of [["subscription.active", null, {}], ["subscription.plan_changed", {}, { recurring_pre_tax_amount: 9900 }], ["subscription.on_hold", {}, {}],
  ["subscription.cancelled", {}, { cancellation_feedback: "too_expensive", cancellation_comment: "Only need it in tax season" }], ["subscription.active", { first_paid_at: new Date() }, {}]])
  console.log(`${type.padEnd(28)} ${classify({ type, data: { ...base, ...extra } }, known).alert ?? "(no alert)"}`);
