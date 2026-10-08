import { test } from "node:test";
import assert from "node:assert/strict";
import { decide, fromExactly } from "../lib/checks.mjs";

const now = new Date("2026-10-13T15:00:00Z");
const row = (sendAt) => ({ send_at: sendAt });

test("on time and clear: send", () => {
  assert.deepEqual(decide(row("2026-10-13T14:55:00Z"), { now, blocked: null, repliedInMailbox: false }), { action: "send" });
});
test("over 3 hours late: missed, even if clear", () => {
  assert.equal(decide(row("2026-10-13T11:59:00Z"), { now, blocked: null, repliedInMailbox: false }).action, "missed");
});
test("unsubscribed or customer: skip", () => {
  assert.deepEqual(decide(row("2026-10-13T14:55:00Z"), { now, blocked: "unsubscribed", repliedInMailbox: false }), { action: "skip", reason: "unsubscribed" });
});
test("replied: skip", () => {
  assert.equal(decide(row("2026-10-13T14:55:00Z"), { now, blocked: null, repliedInMailbox: true }).action, "skip");
});
test("a loose search result from someone else is not a reply", () => {
  const results = [{ from: "someone.else@example.com" }, { from: "Ana@Example.com " }];
  assert.equal(fromExactly(results, "bob@example.com"), false);
  assert.equal(fromExactly(results, "ana@example.com"), true);
});
