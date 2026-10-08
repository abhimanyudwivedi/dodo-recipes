// Put one day's approved drafts into the queue, each at its recipient's local morning.
//   node --env-file=.env scripts/queue.mjs drafts/2026-10-13.json            # dry run: prints the times
//   node --env-file=.env scripts/queue.mjs drafts/2026-10-13.json --go       # writes the queue rows
//
// Drafts file: { "date": "2026-10-13", "drafts": [ { "email", "name", "tz", "kind": "first"|"followup",
//   "subject", "body", "approved": true } ] }. Only approved drafts are queued: you read every one first.
import fs from "fs";
import { morningSlots, isWeekday } from "../lib/schedule.mjs";

const [file, flag] = process.argv.slice(2);
if (!file) { console.error("usage: queue.mjs <drafts.json> [--go]"); process.exit(1); }
const { date, drafts } = JSON.parse(fs.readFileSync(file, "utf8"));

if (!isWeekday(date)) { console.error(`${date} is a weekend: pick a weekday.`); process.exit(1); }
// Queue a week at most. A follow-up queued for next month still goes to someone who replies tomorrow
// unless a check catches it; the shorter the queue, the fewer chances to get that wrong.
if (new Date(`${date}T00:00:00Z`) - Date.now() > 7 * 864e5) { console.error("more than a week ahead: queue closer to the day."); process.exit(1); }

const approved = drafts.filter((d) => d.approved);
const bad = approved.filter((d) => !d.email || !d.tz || !d.subject || !d.body);
if (bad.length) { console.error(`missing fields: ${bad.map((d) => d.email ?? "?").join(", ")}`); process.exit(1); }
for (const d of approved) {
  const words = d.body.trim().split(/\s+/).length;
  if (words > 130) console.warn(`warning: ${d.email} body is ${words} words (aim for 50-120)`);
}

const slots = morningSlots(approved, { date });
for (const s of slots) console.log(`${s.sendAt.toISOString().slice(0, 16)}Z  ${s.local} ${s.tz.padEnd(20)} ${s.kind.padEnd(8)} ${s.email}`);
console.log(`${slots.length} approved, ${drafts.length - approved.length} not approved (left out)`);
if (flag !== "--go") { console.log("dry run: add --go to queue them"); process.exit(0); }

const { db } = await import("../lib/db.mjs");
const sql = db();
let added = 0;
for (const s of slots) {
  if (s.sendAt < new Date()) { console.log(`past already, skipped: ${s.email}`); continue; }
  const r = await sql`insert into outreach_email (key, to_email, name, tz, kind, subject, body, send_at)
    values (${`${date}|${s.email.toLowerCase()}|${s.kind}`}, ${s.email.toLowerCase()}, ${s.name ?? null}, ${s.tz}, ${s.kind ?? "first"}, ${s.subject}, ${s.body}, ${s.sendAt})
    on conflict (key) do nothing returning id`;
  added += r.length;
}
console.log(`queued ${added} (duplicates ignored)`);
await sql.end();
