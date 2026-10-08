---
title: "Send cold email at 9am in every prospect's time zone, for $0, with your own AI"
description: "A founder's build of a cold-email sender that lands in each person's morning, detects replies, and follows up in the same thread. Postgres, a Vercel function and a free cron. Full code."
---

# Send cold email at 9am in every prospect's time zone, for $0

Most cold email goes out when the sender has time, not when the reader does. If you write ten
personal emails in the evening in Bengaluru, they land in a New York inbox at 9am, a Chicago inbox at
8am and a San Francisco inbox at 6am, under everything that arrives before breakfast.

Sequencers fix the timing for $40-100 a month, along with features you don't need if you write every
email yourself. This is the version I built for my own startup instead: about 400 lines, free tiers,
and the Claude subscription I already pay for. The code is open.

## What it does

1. You write and approve each email (your AI drafts; you check every fact).
2. A script turns "9:00 in America/Chicago on Tuesday" into an exact UTC moment, daylight saving
   included, and spreads each time zone's sends 15 minutes apart.
3. Rows go into a Postgres table.
4. A serverless function, pinged every five minutes during the send window, sends whatever is due,
   one at a time, from your real mailbox, so every email sits in your Sent folder.
5. Right before each send it checks: did this person reply? unsubscribe? become a customer? Is the
   email more than three hours late? Any yes means skip.

## The part that matters: local time without a library

Every time zone library exists because this is easy to get wrong. But JavaScript's `Intl` already
knows every zone's offset for any date, so you can do it in a dozen lines:

```js
export function localToUtc(date, time, timeZone) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  let guess = new Date(naive - offsetMinutes(timeZone, new Date(naive)) * 60000);
  guess = new Date(naive - offsetMinutes(timeZone, guess) * 60000); // second pass: DST edges
  return guess;
}
```

The second pass matters for sends near a daylight-saving change. The tests pin it down: 9:00 in New
York is 13:00 UTC in October and 14:00 UTC in November; Arizona never moves; India is +5:30.

## Five things that went wrong, now checks in code

**The mailbox search lied.** Reply detection searched the inbox for mail `from:` each prospect. Our
provider ignored `from:` and returned every message, so every prospect looked like they had replied.
The fix is to use the search syntax that actually filters (`sender:` in our case), and then compare
the address in code anyway. Never trust a provider's filter alone.

**Late is worse than never.** If the cron misses a window, the next run would happily send a
"9am" email at 11pm. Anything more than three hours late is now marked missed.

**Two runs, one email, sent twice.** Each row is claimed with a conditional update
(`set status = 'sending' where status = 'queued'`) before anything else happens.

**Logging before sending.** If you record the send and the provider then rejects it, your records
say someone was emailed when they weren't, and the follow-up goes out cold. Mark sent only after the
provider confirms.

**Queuing a month ahead.** The checks run at send time, but the shorter the queue, the fewer ways to
email someone who answered yesterday. Queue a week at most.

## Free tiers, honestly

Vercel's free plan runs cron jobs once a day, which is too coarse for "each person's morning", so a
free pinger (cron-job.org) calls the function every five minutes, and only during the hours the
mornings fall in. Neon or Supabase holds the queue. The mail goes through your own provider's API.
Total cost: the mailbox you already have.

## Where the money comes in

Cold email ends in a sale or it's a hobby. When someone says yes, the reply carries a payment link.
I use [Dodo Payments](https://dodopayments.com/?utm_source=recipes&utm_medium=article&utm_campaign=recipe-cold-email)
because it's a merchant of record: the prospect in Ohio and the one in Berlin can both pay, and tax
is handled for both. One link per offer tells you which email led to which sale.

## Build it

The full recipe, with the prompts in the order to give them to your AI, the code and the tests, is in
[recipes/cold-email-engine](../recipes/cold-email-engine/). It's the first of a set of growth tools
for founders, each ending in how to get paid for what it brings in.
