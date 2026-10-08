// Writes preview.html with sample rows, so you can look at the email before wiring anything up.
import fs from "fs";
import { buildEmail } from "../lib/report.mjs";
const items = [
  { kind: "done", title: "Published 3 scheduled posts", detail: "LinkedIn, X and your blog", url: "https://example.com/posts" },
  { kind: "done", title: "Replied to 2 support tickets", detail: "Both closed by the customer" },
  { kind: "skipped", title: "Skipped 1 post: it repeated Tuesday's", detail: "Edit it and it goes out tomorrow" },
  { kind: "next", title: "4 posts queued for today" },
];
const m = buildEmail({ customer: { name: "Ana Diaz" }, items, product: "Acme", unsubscribeUrl: "https://example.com/unsubscribe" });
fs.writeFileSync("preview.html", m.html);
console.log(`Subject: ${m.subject}\n\n${m.text}\n\nWrote preview.html`);
