---
name: video-ad-engine
description: Build a code-driven video ad pipeline: one JSON file describes the hook, shots and sourced numbers; it audits the copy, synthesises music on the ad's tempo and renders one beat-synced vertical MP4 per hook with Remotion. Use when a founder wants to make and test ad variants without an editor.
---

# Video ad engine: one JSON file in, beat-synced ads out

Build this recipe into the user's own project, adapted to their stack. The full recipe (system
design, prompts in build order, safety checks, Dodo step) is in this plugin at
`recipes/video-ad-engine/README.md`; the reference code and tests are next to it. If those files are not
available locally, read https://raw.githubusercontent.com/abhimanyudwivedi/dodo-recipes/main/recipes/video-ad-engine/README.md.

## How to run this skill

1. **Ask first, briefly:** their stack (framework, database, host), and anything the recipe needs
   that they may not have yet (Node 20+, Remotion, roughly 100 MB of disk for headless Chrome on first render). Do not assume Vercel or Postgres if they use something else.
2. **Read the README** and follow part 4 ("Build it with your AI") in order, one piece at a time.
   Adapt each piece to their stack; use the reference code in `recipes/video-ad-engine/` as the answer key, not
   as something to paste wholesale.
3. **Port the safety checks in part 5 into code, with tests.** These are the point of the recipe:
   do not skip them to finish faster.
4. **Run the tests** after each piece. Do not report a piece as done until its test passes.
5. **Wire up Dodo Payments in test mode (part 6).** If the Dodo Payments MCP server is connected,
   use it to look up or create the test-mode product, payment link or webhook; otherwise give the
   user the exact dashboard steps. Never ask for, print or commit a live key; keys go in `.env`,
   which must be gitignored.
6. **Finish with a test run end to end** (test card in Dodo test mode, or the recipe's preview
   script) and tell the user exactly what is left for them (DNS, env vars in their host, going live).

## Never

- Send real emails, charge real money or publish anything without the user's explicit go-ahead.
- Put secrets in code, commits or chat.
- Claim the tool works before its tests and the end-to-end check have run.
