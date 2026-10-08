// Gates that run before anything renders. Pure, so they're tested.
import { layout, framesPerBeat } from "./timing.mjs";

const BANNED = [/—/, /!/, /\bguarantee/i, /\bAI-powered\b/i, /\brevolutionary\b/i];

export function audit(ad) {
  const problems = [];
  const { shots, totalFrames } = layout(ad);
  const fpb = framesPerBeat(ad.bpm, ad.fps);
  const seconds = totalFrames / ad.fps;
  if (seconds < 10 || seconds > 30) problems.push(`length ${seconds.toFixed(1)}s: keep ads 10-30 s`);
  for (const [i, s] of shots.entries()) {
    const where = `shot ${i + 1}`;
    if (!Number.isInteger(s.beats) || s.beats < 2) problems.push(`${where}: give it at least 2 whole beats`);
    if (Math.abs(s.from - s.beatStart * fpb) > 0.5) problems.push(`${where}: cut is off the beat`);
    if (!s.graphic) problems.push(`${where}: every line needs a graphic`);
    if (s.graphic === "counter") {
      const f = ad.facts?.[s.fact];
      if (!f) problems.push(`${where}: counter needs a fact from "facts", never a number typed into the shot`);
      else if (!f.source) problems.push(`${where}: fact "${s.fact}" has no source`);
      else if (s.line && !s.line.includes(String(f.value))) problems.push(`${where}: line says a different number than fact "${s.fact}" (${f.value})`);
    }
    const text = [s.line, s.caption, s.cta, s.label, ...(s.words ?? [])].filter(Boolean).join(" ");
    for (const re of BANNED) if (re.test(text)) problems.push(`${where}: "${text}" matches ${re}`);
    // Any digit on screen must come from a fact, so a number can't drift between the script and the ad.
    const digits = (s.graphic === "counter" ? (s.caption ?? "") : text).match(/\d+/g) ?? [];
    for (const d of digits) if (!Object.values(ad.facts ?? {}).some((f) => String(f.value) === d)) problems.push(`${where}: number ${d} is not in "facts"`);
  }
  if (!shots.length || shots[0].graphic !== "hook") problems.push("the first shot must be the hook");
  if (shots.at(-1)?.graphic !== "cta") problems.push("the last shot must be the call to action");
  for (const h of ad.hooks ?? []) {
    if (h.words.length > 5) problems.push(`hook "${h.id}": ${h.words.length} words, keep it to 5`);
    for (const re of BANNED) if (re.test(h.words.join(" "))) problems.push(`hook "${h.id}" matches ${re}`);
  }
  return problems;
}
