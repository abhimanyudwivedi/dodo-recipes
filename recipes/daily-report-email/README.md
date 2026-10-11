# The daily report email your customers actually open

Every morning, each paying customer gets one email: what your product did for them yesterday, what
it skipped and why, and what's next. Built from your own database, sent only to people with an
active Dodo subscription, and never sent empty.

## 1. What you'll have at the end

```
Subject: 2 done for you yesterday

Hi Ana,
Here's what Acme did for you yesterday.

Done (2):
- Published 3 scheduled posts
- Replied to 2 support tickets

Skipped, and why (1):
- Skipped 1 post: it repeated Tuesday's

Next:
- 4 posts queued for today
```

Run `npm run preview` to see the HTML version in your browser.

## 2. Who it's for, and what it replaces

Any product that does work for customers while they're away: a scheduler, a monitor, an agent, a
service business. The report is how they notice the work, and noticing the work is why they renew.
It replaces building a reporting dashboard nobody opens, or a generic weekly-digest tool.

## 3. System design

```
Dodo webhook ─▶ api/dodo-webhook.js ─▶ customer.subscription_status, paid_through
your product ─▶ activity rows (done / skipped / next)

Vercel cron, daily ─▶ api/daily-report.js
   for each paying customer:
     yesterday's rows, in their own time zone
     nothing done?  ─▶ skip (no empty emails)
     build email (every number counted from rows) ─▶ Resend
   ─▶ report_run: sent, skipped with reasons, failed with errors
```

| Part | Where it runs | Cost |
|---|---|---|
| Tables | Neon or Supabase Postgres | free tier |
| Report, webhook, unsubscribe | Vercel functions | free tier (one daily cron is allowed on Hobby) |
| Sending | Resend | free up to 3,000 emails a month |
| Billing state | Dodo Payments webhooks | included |

## 4. Build it with your AI

1. **Tables.** "Postgres tables for customers (email, time zone, Dodo subscription id, status,
   paid-through date, unsubscribed_at), activity rows (customer, kind done/skipped/next, title,
   detail, url) and a run log that stores skipped and failed customers with reasons."
   → `schema.sql`
2. **Gate.** "A pure function: send only if the customer is paying (active, or cancelled with a
   paid-through date still ahead), hasn't unsubscribed, and had at least one 'done' row yesterday.
   Return the reason when it says no. Tests for each case." → `lib/report.mjs`
3. **Template.** "A mobile-first HTML email plus a plain-text version from those rows. The subject
   and every count come from the rows. Escape all HTML." → `buildEmail`
4. **Yesterday.** "Yesterday's start and end in UTC for a customer's IANA time zone, correct
   across daylight saving, no libraries." → `yesterdayWindow`
5. **Billing.** "A Vercel function for Dodo Payments webhooks: verify the Standard Webhooks signature
   on the raw body, then map subscription.active / renewed / updated / on_hold / cancelled / expired
   to the customer row." → `api/dodo-webhook.js`, `lib/dodo.mjs`
6. **Unsubscribe.** "A signed one-click unsubscribe link (HMAC of the email), a route that accepts
   GET and POST, and List-Unsubscribe headers on every send." → `lib/unsubscribe.mjs`, `api/unsubscribe.js`

### Run it

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fabhimanyudwivedi%2Fdodo-recipes&root-directory=recipes%2Fdaily-report-email&project-name=daily-report-email&env=DATABASE_URL%2CCRON_SECRET%2CAPP_URL%2CPRODUCT_NAME%2CMAIL_FROM%2CRESEND_API_KEY%2CUNSUBSCRIBE_SECRET%2CDODO_WEBHOOK_KEY&envDescription=Database%2C+Resend%2C+an+unsubscribe+secret+and+your+Dodo+webhook+signing+key.&envLink=https%3A%2F%2Fgithub.com%2Fabhimanyudwivedi%2Fdodo-recipes%2Fblob%2Fmain%2Frecipes%2Fdaily-report-email%2F.env.example)

Deploys to **your own** Vercel account; you'll be asked for the environment variables above. Then run `schema.sql` on your database and add the webhook or cron as below.

Or by hand:

```
npm install && npm test
cp .env.example .env
psql "$DATABASE_URL" -f schema.sql
npm run preview
vercel deploy --prod        # the cron in vercel.json starts the next day
```

In the Dodo dashboard: Developer → Webhooks → add `https://<your-app>.vercel.app/api/dodo-webhook`,
subscribe to the `subscription.*` events, and put the signing key in `DODO_WEBHOOK_KEY`. Check the
Event catalog tab there for the exact list your account sends.

## 5. Make it safe

- **Never send an empty report.** One "nothing happened" email teaches people to skip the next ten.
- **Numbers come from the database, never from a model.** If you add an AI-written summary line,
  give it the counts; never let it produce them.
- **Log what failed, not just how many sent.** A run where every send failed looks fine if the log
  only says "ran". `report_run` keeps each skipped and failed customer with the reason.
- **Verify the webhook signature on the raw body.** Parse first and the signature check fails, or
  worse, gets removed "to make it work".
- **Cancelled is not the same as gone.** A customer who cancels keeps what they paid for until
  `paid_through`; keep reporting until then.
- **Send reports from a subdomain** (`send.yourdomain.com`), apart from your personal and cold mail.

## 6. Bill with Dodo

The report is gated on the Dodo subscription, so it's a paid feature by construction:

- Sell the plan with a [Checkout Session](https://docs.dodopayments.com/developer-resources/checkout-session.md)
  or a payment link; the `subscription.active` webhook turns the reports on.
- When a payment fails, Dodo moves the subscription to `on_hold` and the reports stop. When the
  card is fixed, the next renewal event turns them back on, with no code from you.
- Add a "manage your plan" link to the footer pointing to Dodo's customer portal, so people can
  update a card without emailing you.

Start with [Dodo Payments](https://dodopayments.com/?utm_source=recipes&utm_medium=gallery&utm_campaign=recipe-daily-report)
in test mode: test webhooks hit the same endpoint.

## 7. Built and used at Zipply

Zipply sends every paying customer a report each morning: the roles it scored, applied to and
skipped for them. The rules in part 5 are the ones it learned, in
particular "log what failed": in one week, three of its scheduled jobs showed success while quietly
skipping customers, because each log recorded what the job did and never what it failed to do.
