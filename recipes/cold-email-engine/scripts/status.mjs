// What went out, what is waiting, what was skipped and why.
//   node --env-file=.env scripts/status.mjs
import { db } from "../lib/db.mjs";
const sql = db();
const days = await sql`select to_char(send_at at time zone 'UTC', 'YYYY-MM-DD') as day, status, count(*)::int as n
  from outreach_email group by 1, 2 order by 1, 2`;
const byDay = {};
for (const r of days) (byDay[r.day] ??= {})[r.status] = r.n;
for (const [d, s] of Object.entries(byDay)) console.log(d, Object.entries(s).map(([k, v]) => `${k} ${v}`).join(", "));
const problems = await sql`select to_email, status, detail from outreach_email where status in ('skipped','error','missed') order by send_at desc limit 15`;
if (problems.length) { console.log("\nlatest not sent:"); for (const p of problems) console.log(`  ${p.status.padEnd(7)} ${p.to_email}  ${p.detail ?? ""}`); }
const [next] = await sql`select to_email, send_at from outreach_email where status = 'queued' order by send_at limit 1`;
console.log(next ? `\nnext: ${next.to_email} at ${next.send_at.toISOString().slice(0, 16)}Z` : "\nnothing queued");
await sql.end();
