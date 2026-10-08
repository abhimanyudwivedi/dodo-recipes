// What a Dodo subscription webhook means for a customer row. Pure, so it is tested.
// Event names as Dodo sends them; check Developer > Webhooks > Event catalog in your dashboard.
export function subscriptionUpdate(event) {
  const d = event.data ?? {};
  if (!d.subscription_id || !event.type?.startsWith("subscription.")) return null;
  const base = { subscriptionId: d.subscription_id, email: d.customer?.email?.toLowerCase() ?? null,
    name: d.customer?.name ?? null, paidThrough: d.next_billing_date ?? null };
  switch (event.type) {
    case "subscription.active":
    case "subscription.renewed":
    case "subscription.updated":
      return { ...base, status: d.status ?? "active" };
    case "subscription.on_hold":     // payment failed: stop reports until it recovers
      return { ...base, status: "on_hold" };
    case "subscription.cancelled":   // keeps access (and reports) until paid_through
      return { ...base, status: "cancelled" };
    case "subscription.expired":
    case "subscription.failed":
      return { ...base, status: "expired" };
    default:
      return null;
  }
}
