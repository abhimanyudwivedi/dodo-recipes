import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { layout, withHook } from "../src/timing.mjs";
import { audit } from "../src/audit.mjs";

const ad = JSON.parse(fs.readFileSync(new URL("../ads/example.json", import.meta.url)));

test("120 bpm at 30 fps is 15 frames a beat, and every shot starts on one", () => {
  const { shots, totalFrames, fpb } = layout(ad);
  assert.equal(fpb, 15);
  for (const s of shots) assert.equal(s.from % 15, 0);
  assert.equal(totalFrames, 28 * 15);
});
test("the example ad passes the audit", () => assert.deepEqual(audit(ad), []));
test("a hook variant changes only the first shot", () => {
  const v = withHook(ad, "chasing");
  assert.equal(v.shots[0].line, "Still chasing invoices?");
  assert.deepEqual(v.shots.slice(1), ad.shots.slice(1));
});
test("a number typed into a line instead of a fact is caught", () => {
  const bad = structuredClone(ad);
  bad.shots[3].caption = "paid in 3 days";
  assert.ok(audit(bad).some((p) => p.includes("number 3")));
});
test("a counter whose line disagrees with its fact is caught", () => {
  const bad = structuredClone(ad);
  bad.shots[2].line = "It chased 50 invoices";
  assert.ok(audit(bad).some((p) => p.includes("different number")));
});
test("em dashes, exclamation marks and guarantees are caught", () => {
  const bad = structuredClone(ad);
  bad.shots[5].cta = "Guaranteed results!";
  assert.ok(audit(bad).length >= 2);
});
