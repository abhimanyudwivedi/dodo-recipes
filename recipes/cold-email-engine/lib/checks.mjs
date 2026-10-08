// The decision made right before every send. Pure function, so it is tested without a database or a mailbox.
export const LATE_MS = 3 * 3600e3; // more than 3 hours late: skip, never send someone an email at midnight

/**
 * @param row   the queued email
 * @param ctx   { now: Date, blocked: string|null (reason from do_not_email), repliedInMailbox: boolean }
 * @returns { action: "send" } | { action: "skip"|"missed", reason }
 */
export function decide(row, { now, blocked, repliedInMailbox }) {
  const late = now.getTime() - new Date(row.send_at).getTime();
  if (late > LATE_MS) return { action: "missed", reason: "more than 3 hours late" };
  if (blocked) return { action: "skip", reason: blocked };
  // Mail search APIs can be loose (one ignored the sender filter and matched everyone),
  // so the caller must confirm an exact address match before passing repliedInMailbox = true.
  if (repliedInMailbox) return { action: "skip", reason: "replied" };
  return { action: "send" };
}

/** Exact address match on search results: never trust the provider's filter alone. */
export const fromExactly = (messages, email) =>
  messages.some((m) => (m.from ?? "").trim().toLowerCase() === email.trim().toLowerCase());
