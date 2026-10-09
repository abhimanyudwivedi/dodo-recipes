// What a Dodo subscription event means for you, the founder. Pure: no database, no network.
// Event names from Dodo's docs (Developer > Webhooks > Event catalog in your dashboard).

/**
 * @param event    the verified webhook body: { type, data }
 * @param known    the customer row we already have for this email, or null
 * @returns { kind, alert: string|null, onboarding: "start"|"stop"|null, status }
 */
export function classify(event, known) {
  const d = event.data ?? {};
  const who = d.customer?.name || d.customer?.email || "Someone";
  const plan = money(d.recurring_pre_tax_amount, d.currency, d.payment_frequency_interval);
  const country = d.billing?.country ? ` from ${d.billing.country}` : "";
  switch (event.type) {
    case "subscription.active":
      if (known?.first_paid_at) return { kind: "reactivated", alert: `${who} is back${plan ? ` on ${plan}` : ""}.`, onboarding: null, status: "active" };
      return { kind: "new", alert: `New customer: ${who}${country}${plan ? `, ${plan}` : ""}.`, onboarding: "start", status: "active" };
    case "subscription.renewed":
      return { kind: "renewed", alert: null, onboarding: null, status: "active" };   // good news needs no ping
    case "subscription.plan_changed":
      return { kind: "plan_changed", alert: `${who} changed plan${plan ? ` to ${plan}` : ""}.`, onboarding: null, status: d.status ?? "active" };
    case "subscription.on_hold":
    case "subscription.past_due":
    case "subscription.failed":
      return { kind: "payment_failed", alert: `Payment failed for ${who}. Worth a personal note today, before they drift.`, onboarding: null, status: event.type.split(".")[1] };
    case "subscription.cancelled": {
      const why = [d.cancellation_feedback, d.cancellation_comment].filter(Boolean).join(": ");
      return { kind: "cancelled", alert: `${who} cancelled.${why ? ` Reason they gave: "${why}"` : " No reason given: ask them, one question, no pitch."}`, onboarding: "stop", status: "cancelled" };
    }
    case "subscription.expired":
      return { kind: "expired", alert: null, onboarding: "stop", status: "expired" };
    default:
      return { kind: "ignored", alert: null, onboarding: null, status: null };
  }
}

/** "$50.00/month" from Dodo's amount in the smallest currency unit. */
export function money(minor, currency, interval) {
  if (minor == null || !currency) return "";
  const amount = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minor / 100);
  const per = { Month: "month", Year: "year", Week: "week", Day: "day" }[interval] ?? null;
  return per ? `${amount}/${per}` : amount;
}
