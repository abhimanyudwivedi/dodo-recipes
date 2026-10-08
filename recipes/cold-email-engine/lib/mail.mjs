// Mail providers. Each adapter has the same three methods:
//   send({ to, subject, body })                    a new email, plain text
//   reply({ to, subject, body })                   a follow-up in the same thread as the first email
//   messagesFrom(email) -> [{ from }]              recent mail received from this address (reply detection)
// Pick one with MAIL_PROVIDER=zoho|resend. Clients are created on first use, never at import.

const env = (k) => { const v = process.env[k]; if (!v) throw new Error(`${k} is not set`); return v; };

// ---------- Zoho Mail (send + reply in thread + reply detection) ----------
let zohoToken = null, zohoTokenAt = 0;
async function zohoHeaders() {
  if (!zohoToken || Date.now() - zohoTokenAt > 40 * 60e3) {
    const r = await fetch(`${env("ZOHO_ACCOUNTS_URL")}/oauth/v2/token`, { method: "POST", body: new URLSearchParams({
      client_id: env("ZOHO_CLIENT_ID"), client_secret: env("ZOHO_CLIENT_SECRET"),
      grant_type: "refresh_token", refresh_token: env("ZOHO_REFRESH_TOKEN") }) });
    const j = await r.json();
    if (!j.access_token) throw new Error(`Zoho token refresh failed: ${j.error ?? r.status}`);
    zohoToken = j.access_token; zohoTokenAt = Date.now();
  }
  return { Authorization: `Zoho-oauthtoken ${zohoToken}`, "Content-Type": "application/json" };
}
const zohoApi = () => `${env("ZOHO_MAIL_API")}/api/accounts/${env("ZOHO_ACCOUNT_ID")}`;
async function zohoSearch(key) {
  const r = await fetch(`${zohoApi()}/messages/search?searchKey=${encodeURIComponent(key)}&limit=25`, { headers: await zohoHeaders() });
  return (await r.json().catch(() => ({}))).data ?? [];
}
async function zohoPost(url, payload) {
  const r = await fetch(url, { method: "POST", headers: await zohoHeaders(), body: JSON.stringify(payload) });
  const j = await r.json().catch(() => ({}));
  if (!(r.ok && j.status?.code === 200)) throw new Error(`Zoho send failed: HTTP ${r.status} ${JSON.stringify(j.status ?? j).slice(0, 120)}`);
}
// Zoho prints its "---- On ... wrote ----" header inline in plain-text replies; HTML lets Gmail fold it.
const toHtml = (t) => t.split("\n").map((l) => l.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")).join("<br>");

const zoho = {
  send: ({ to, subject, body }) =>
    zohoPost(`${zohoApi()}/messages`, { fromAddress: env("MAIL_FROM"), toAddress: to, subject, content: body, mailFormat: "plaintext" }),
  async reply({ to, subject, body }) {
    // Find the first email (not a reply) we sent this person, by exact address.
    const sent = (await zohoSearch(`to:${to}::in:Sent`))
      .filter((m) => (m.toAddress ?? "").toLowerCase().includes(to.toLowerCase()) && !/^re:/i.test((m.subject ?? "").trim()));
    const orig = sent.at(-1);
    if (!orig?.messageId) throw new Error("original email not found in Sent");
    await zohoPost(`${zohoApi()}/messages/${orig.messageId}`, {
      fromAddress: env("MAIL_FROM"), toAddress: to, subject: `Re: ${orig.subject.trim()}`, content: toHtml(body), mailFormat: "html", action: "reply" });
  },
  // Zoho ignores "from:" in search and returns everything; "sender:" works. The exact match happens in checks.fromExactly.
  messagesFrom: async (email) => (await zohoSearch(`sender:${email}`)).map((m) => ({ from: m.fromAddress ?? "" })),
};

// ---------- Resend (send only; replies are recorded by hand in do_not_email) ----------
async function resendPost(payload) {
  const r = await fetch("https://api.resend.com/emails", { method: "POST",
    headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error(`Resend send failed: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`);
}
const resend = {
  send: ({ to, subject, body }) => resendPost({ from: env("MAIL_FROM"), to, subject, text: body }),
  // Without mailbox access there is no thread to reply into: same subject with "Re:" keeps most clients grouping it.
  reply: ({ to, subject, body }) => resendPost({ from: env("MAIL_FROM"), to, subject: /^re:/i.test(subject) ? subject : `Re: ${subject}`, text: body }),
  messagesFrom: async () => [],
};

export function mailer() {
  const p = (process.env.MAIL_PROVIDER ?? "zoho").toLowerCase();
  if (p === "zoho") return zoho;
  if (p === "resend") return resend;
  throw new Error(`unknown MAIL_PROVIDER ${p}`);
}
