// The onboarding sequence. Edit the steps and the copy; keep it short and from a person.
export const SEQUENCE = [
  { step: "welcome", day: 0, subject: "You're in, {first}",
    body: "Hi {first},\n\nThanks for signing up. One thing to do today: {first_action}.\n\nReply to this email if anything is unclear. It comes to me.\n\n{founder}" },
  { step: "first-win", day: 2, subject: "Did you get your first result?",
    body: "Hi {first},\n\nBy now you should have seen {first_result}. If you haven't, reply and I'll look at your account myself.\n\n{founder}" },
  { step: "check-in", day: 6, subject: "One question",
    body: "Hi {first},\n\nWhat's the one thing that would make {product} more useful for you this week?\n\n{founder}" },
];

/** Rows to insert when a customer starts: one per step, at day offsets from `start`. */
export function schedule(email, start) {
  return SEQUENCE.map((s) => ({ email, step: s.step, send_at: new Date(start.getTime() + s.day * 864e5) }));
}

export function render(step, vars) {
  const s = SEQUENCE.find((x) => x.step === step);
  const fill = (t) => t.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
  return { subject: fill(s.subject), text: fill(s.body) };
}
