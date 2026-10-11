# Build the growth tools you'd otherwise rent

**Site:** https://abhimanyudwivedi.github.io/dodo-recipes/ · **Claude Code:** `/plugin marketplace add abhimanyudwivedi/dodo-recipes` then `/plugin install build-it-recipes@build-it-recipes`

Complete, working tools a founder can build in an afternoon with the Claude or ChatGPT subscription
they already pay for. Each runs on free tiers, ships with tests, and ends with how to get paid
through [Dodo Payments](https://dodopayments.com/?utm_source=recipes&utm_medium=github&utm_campaign=recipes-home).

| Recipe | What it does | Replaces |
|---|---|---|
| [Cold-email engine](recipes/cold-email-engine/) | Approved drafts sent at 9am in each recipient's time zone; replies detected; follow-ups in thread | sequencers, $40-100/mo |
| [Video ad engine](recipes/video-ad-engine/) | One JSON file → audited, beat-synced vertical ads, one MP4 per hook | editor per variant, video tools |
| [Daily report email](recipes/daily-report-email/) | What your product did for each paying customer yesterday, gated on their Dodo subscription | a dashboard nobody opens |
| [Customer alerts](recipes/customer-alerts/) | Slack/Discord/Telegram alerts for payments, failed payments and cancellations (with the reason), plus onboarding emails, from Dodo webhooks | checking the dashboard, an onboarding tool |

Every recipe has the same seven parts: what you'll have, who it's for, system design, the prompts
in build order, the safety checks (in code, with tests), charging with Dodo, and how it's used on a
real business. The gallery page is `site/index.html`; `mintlify/` holds the same recipes as Mintlify docs pages.

## Use them with your AI

- **Any AI:** open a recipe and paste the part-4 prompts in order.
- **Claude Code:** install the plugin above and say "build the customer alerts recipe"; each recipe is a skill.
- **Deploy as-is:** the Deploy with Vercel button in each recipe deploys to your own account.

```
cd recipes/<name> && npm install && npm test
```

Written by the founder of Zipply, which runs on these tools and takes payments through Dodo. MIT licensed.
