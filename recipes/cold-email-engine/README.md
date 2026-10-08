# Cold-email engine that sends in each person's morning

Personal cold email, written with your own AI, reviewed by you, and sent one at a time at 9am in
**each recipient's own time zone**. Anyone who replies or unsubscribes is never emailed again.
Runs on free tiers.

## 1. What you'll have at the end

```
$ node scripts/queue.mjs drafts/2026-10-13.json
2026-10-13T08:00Z  09:00 Europe/London        first    di@example.com
2026-10-13T14:00Z  09:00 America/Chicago      first    ana@example.com
2026-10-13T14:15Z  09:15 America/Chicago      first    bo@example.com
2026-10-13T16:00Z  09:00 America/Phoenix      first    cy@example.com
```

Each email leaves your real mailbox at that moment, shows in your Sent folder, and follow-ups land
in the same thread as the first email.

## 2. Who it's for, and what it replaces

Founders who send 10-20 hand-written cold emails a day and want them to arrive when people read
mail, without paying for a sequencer (Instantly, Lemlist, Apollo sequences: roughly $40-100 a month).
This is not a bulk mailer. It sends what you approved, slowly, from your own mailbox.

## 3. System design

```
leads ─▶ drafts (your Claude/ChatGPT, "verify every fact" rule) ─▶ drafts/<date>.json (you approve)
      ─▶ scripts/queue.mjs   exact UTC send time per person, daylight-saving aware
      ─▶ Postgres table outreach_email
      ─▶ api/send-due.js  ◀── cron-job.org, every 5 min, weekdays, send window only
           before each send: unsubscribed / customer / replied? ─▶ skip
           more than 3 h late? ─▶ missed (never sent at midnight)
      ─▶ mail API: new email, or reply in the original thread
```

| Part | Where it runs | Cost |
|---|---|---|
| Queue table | Neon or Supabase Postgres | free tier |
| `api/send-due.js` | Vercel serverless function | free tier |
| Pinger | cron-job.org (Vercel's free crons run once a day) | free |
| Mail | Zoho Mail API (send, reply in thread, reply detection) or Resend (send only) | your mailbox |

## 4. Build it with your AI

Paste these into Claude or ChatGPT in order. Each one produces one working piece; the files in this
folder are what they produced for us, so you can compare.

1. **Queue.** "Write a Postgres table for queued emails: unique key per person per day per kind,
   recipient, IANA time zone, kind (first/followup), subject, body, exact send time, status
   (queued/sending/sent/skipped/error/missed), detail. Plus a do_not_email table." → `schema.sql`
2. **Drafts.** "For each lead, write a 50-120 word email. First line says where I found them. Then
   one thing only they could receive, taken from their own material, and every fact must be checked
   against the source I give you. One question at the end. No pitch before the last two sentences."
3. **Scheduler.** "In plain Node with no libraries, convert 'HH:MM on YYYY-MM-DD in this IANA zone'
   to a UTC Date, correct across daylight saving. Spread each zone's sends 15 minutes apart from
   9:00. Write node:test tests for New York in October and November, Arizona and India."
   → `lib/schedule.mjs`, `test/schedule.test.mjs`
4. **Sender.** "A Vercel function protected by a Bearer secret: take up to 6 due rows, claim each
   one (status sending) before doing anything, run the checks, send, and mark it sent only after the
   mail API accepts it." → `api/send-due.js`
5. **Reply detection.** "Search the mailbox for mail from this address and confirm the sender
   matches exactly in code; don't trust the search filter." → `lib/mail.mjs`, `lib/checks.mjs`
6. **Status.** "Per day: sent, skipped, errors, missed, the latest reasons, and what's next."
   → `scripts/status.mjs`

### Run it

```
npm install
cp .env.example .env            # fill it in
psql "$DATABASE_URL" -f schema.sql
npm test
node --env-file=.env scripts/queue.mjs drafts/2026-10-13.json          # dry run
node --env-file=.env scripts/queue.mjs drafts/2026-10-13.json --go
vercel deploy --prod            # set the same env vars in Vercel
```

Then on cron-job.org: URL `https://<your-app>.vercel.app/api/send-due`, header
`Authorization: Bearer <CRON_SECRET>`, schedule every 5 minutes only in the hours your recipients'
mornings fall in (for the US from Europe or Asia, roughly 13:00-20:00 UTC), Monday to Friday.

## 5. Make it safe

Every one of these was learned by getting it wrong first.

- **Check exact addresses in code.** Zoho's search ignored `from:` and returned every message, so
  every prospect looked like they had replied. `sender:` works, and the code still compares the
  address itself.
- **Skip, don't send late.** Anything more than 3 hours late is marked missed. A send at midnight
  their time is worse than no send.
- **Claim before sending.** A row moves to `sending` in one conditional update before anything else,
  so two overlapping runs can never send the same email twice.
- **Record a send only after the provider accepts it.** Otherwise your record says someone was
  emailed when they were not, and the follow-up goes out cold.
- **Queue a week at most.** The checks run at send time, but the shorter the queue, the fewer ways
  to email someone who already answered.
- **Use a separate domain for cold email.** Your product's transactional mail should not share its
  reputation.
- **Ping only in the send window.** It keeps a free-tier function's CPU use small.
- **Unsubscribe means never again, with no reply.** Add them to `do_not_email`.

## 6. Charge for it with Dodo

Cold email ends in a sale or it is a hobby. Two ways to close the loop with
[Dodo Payments](https://dodopayments.com/?utm_source=recipes&utm_medium=gallery&utm_campaign=recipe-cold-email),
which acts as merchant of record, so sales tax and VAT are handled for you:

- **Reply with a payment link.** When someone says yes, send a Dodo
  [payment link](https://docs.dodopayments.com/changelog/v1.70.0.md) for the product or service, one
  link per offer so you can see which email led to which sale. No checkout page to build.
- **Sell the engine.** Host this for other founders as a small subscription:
  [Checkout Sessions](https://docs.dodopayments.com/developer-resources/checkout-session.md) for
  sign-up, the [subscription guide](https://docs.dodopayments.com/developer-resources/subscription-integration-guide.md)
  for monthly billing, and a webhook that turns sending on only while the subscription is active.

Try it with a test-mode link first: <!-- TODO: test-mode Dodo payment link -->

## 7. Built and used at Zipply

Zipply is a job-search concierge. Its founder sends personal emails to people job hunting, written
about each person's own post, and this engine has sent them since 8 October 2026: each one at that
person's morning, follow-ups in the original thread, and anyone who replied skipped automatically.
The safety rules in part 5 come from building it.
