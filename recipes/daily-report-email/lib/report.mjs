// Pure functions: decide whether a customer gets an email, and build it. No database, no network,
// so every rule here is tested.

/** Paying = Dodo says active, or they cancelled but have paid through a date still ahead. */
export function isPaying(c, now = new Date()) {
  if (!c.paid_through || new Date(c.paid_through) <= now) return false;
  return ["active", "cancelled"].includes(c.subscription_status);
}

/**
 * The gate. An empty email teaches people to ignore the next one, so a customer gets a report
 * only when something was actually done for them.
 */
export function shouldSend(c, items, now = new Date()) {
  if (c.unsubscribed_at) return { send: false, reason: "unsubscribed" };
  if (!isPaying(c, now)) return { send: false, reason: "not paying" };
  if (!items.some((i) => i.kind === "done")) return { send: false, reason: "nothing done yesterday" };
  return { send: true };
}

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Every number in the email is counted from the rows here, never written by a model. */
export function buildEmail({ customer, items, product, unsubscribeUrl }) {
  const done = items.filter((i) => i.kind === "done");
  const skipped = items.filter((i) => i.kind === "skipped");
  const next = items.filter((i) => i.kind === "next");
  const first = (customer.name ?? "").split(" ")[0] || "there";
  const subject = `${done.length} done for you yesterday`;

  const list = (rows) => rows.map((r) => `<li style="margin:0 0 8px">${r.url ? `<a href="${esc(r.url)}" style="color:#111">${esc(r.title)}</a>` : esc(r.title)}${r.detail ? `<br><span style="color:#666;font-size:13px">${esc(r.detail)}</span>` : ""}</li>`).join("");
  const section = (h, rows) => rows.length ? `<h3 style="font-size:15px;margin:24px 0 8px">${h}</h3><ul style="padding-left:18px;margin:0">${list(rows)}</ul>` : "";

  const html = `<!doctype html><html><body style="margin:0;background:#f6f6f4">
<div style="max-width:560px;margin:0 auto;padding:24px 16px;font:15px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#111">
<p>Hi ${esc(first)},</p>
<p>Here's what ${esc(product)} did for you yesterday.</p>
${section(`Done (${done.length})`, done)}
${section(`Skipped, and why (${skipped.length})`, skipped)}
${section("Next", next)}
<p style="margin-top:32px;color:#888;font-size:12px">You get this because you have a ${esc(product)} plan. <a href="${esc(unsubscribeUrl)}" style="color:#888">Stop these emails</a>.</p>
</div></body></html>`;

  const text = [`Hi ${first},`, "", `Here's what ${product} did for you yesterday.`, "",
    `Done (${done.length}):`, ...done.map((r) => `- ${r.title}`),
    ...(skipped.length ? ["", `Skipped, and why (${skipped.length}):`, ...skipped.map((r) => `- ${r.title}`)] : []),
    ...(next.length ? ["", "Next:", ...next.map((r) => `- ${r.title}`)] : []),
    "", `Stop these emails: ${unsubscribeUrl}`].join("\n");
  return { subject, html, text };
}

/** "Yesterday" in the customer's own time zone, as a UTC [start, end) window. */
export function yesterdayWindow(tz, now = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const midnight = (d) => {
    const naive = Date.parse(`${d}T00:00:00Z`);
    const off = (at) => {
      const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(at).map((x) => [x.type, x.value]));
      return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - at.getTime();
    };
    let g = naive - off(new Date(naive)); g = naive - off(new Date(g));
    return new Date(g);
  };
  const today = midnight(ymd);
  const prev = new Date(Date.parse(`${ymd}T12:00:00Z`) - 864e5).toISOString().slice(0, 10);
  return { start: midnight(prev), end: today };
}
