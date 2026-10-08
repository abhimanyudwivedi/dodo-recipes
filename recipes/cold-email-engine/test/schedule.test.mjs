import { test } from "node:test";
import assert from "node:assert/strict";
import { localToUtc, morningSlots, isWeekday } from "../lib/schedule.mjs";

test("9:00 in New York during daylight saving is 13:00 UTC", () => {
  assert.equal(localToUtc("2026-10-13", "09:00", "America/New_York").toISOString(), "2026-10-13T13:00:00.000Z");
});
test("after the November change it is 14:00 UTC", () => {
  assert.equal(localToUtc("2026-11-10", "09:00", "America/New_York").toISOString(), "2026-11-10T14:00:00.000Z");
});
test("Arizona does not observe daylight saving", () => {
  assert.equal(localToUtc("2026-10-13", "09:00", "America/Phoenix").toISOString(), "2026-10-13T16:00:00.000Z");
});
test("India has a half-hour offset", () => {
  assert.equal(localToUtc("2026-10-13", "09:00", "Asia/Kolkata").toISOString(), "2026-10-13T03:30:00.000Z");
});
test("morning slots are 15 minutes apart within a zone and never collide", () => {
  const s = morningSlots(
    [{ email: "a", tz: "America/Chicago" }, { email: "b", tz: "America/Chicago" }, { email: "c", tz: "America/Los_Angeles" }],
    { date: "2026-10-13" });
  assert.deepEqual(s.map((x) => x.local), ["09:00", "09:15", "09:00"]);
  assert.equal(new Set(s.map((x) => x.sendAt.toISOString())).size, 3);
});
test("weekends are not sending days", () => {
  assert.equal(isWeekday("2026-10-10"), false);
  assert.equal(isWeekday("2026-10-12"), true);
});
