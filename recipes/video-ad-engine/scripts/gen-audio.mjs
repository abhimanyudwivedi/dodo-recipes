// Original music + sound effects, synthesised from numbers: nothing to license, nothing to pay.
// The bed is built on the ad's own BPM, so the beat the cuts land on is the beat you hear.
//   node scripts/gen-audio.mjs ads/example.json
import fs from "node:fs";
import { layout } from "../src/timing.mjs";

const SR = 44100;
const ad = JSON.parse(fs.readFileSync(process.argv[2] ?? "ads/example.json", "utf8"));
fs.mkdirSync("public/audio", { recursive: true });

function wav(file, data) {
  const n = data.length, buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  const peak = data.reduce((m, x) => Math.max(m, Math.abs(x)), 1e-9);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round((data[i] / peak) * 0.89 * 32767), 44 + i * 2);
  fs.writeFileSync(`public/audio/${file}`, buf);
}
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
let seed = 7;
const noise = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) * 2 - 1;
const tone = (out, at, dur, f, vol, shape = (t, d) => Math.exp(-t * 6 / d)) => {
  const s = Math.floor(at * SR), n = Math.floor(dur * SR);
  for (let i = 0; i < n && s + i < out.length; i++) { const t = i / SR; out[s + i] += Math.sin(2 * Math.PI * f * t) * vol * shape(t, dur); }
};

// Music bed: four chords, one per bar, a pluck on every beat, a soft kick from bar 2.
const { totalBeats } = layout(ad);
const spb = 60 / ad.bpm, bed = new Float32Array(Math.ceil((totalBeats * spb + 1) * SR));
const chords = [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]];
for (let b = 0; b < totalBeats; b++) {
  const t = b * spb, ch = chords[Math.floor(b / 4) % 4];
  if (b % 4 === 0) for (const m of ch) tone(bed, t, spb * 4, hz(m), 0.05, (x, d) => Math.min(1, x * 8) * Math.exp(-x / d));
  tone(bed, t, spb * 0.9, hz(ch[b % 4] + 12), 0.08);
  if (b >= 4) tone(bed, t, 0.25, 55, 0.35, (x) => Math.exp(-x * 18));
}
const fadeFrom = (totalBeats - 2) * spb * SR;
for (let i = Math.floor(fadeFrom); i < bed.length; i++) bed[i] *= Math.max(0, 1 - (i - fadeFrom) / (2 * spb * SR));
wav("bed.wav", bed);

// Effects: one per kind of on-screen event.
const fx = (name, secs, fill) => { const o = new Float32Array(Math.floor(secs * SR)); fill(o); wav(`${name}.wav`, o); };
fx("pop", 0.15, (o) => tone(o, 0, 0.15, 880, 1, (t) => Math.exp(-t * 40)));
fx("tick", 0.06, (o) => tone(o, 0, 0.06, 2200, 1, (t) => Math.exp(-t * 90)));
fx("stamp", 0.4, (o) => { tone(o, 0, 0.4, 70, 1, (t) => Math.exp(-t * 12)); for (let i = 0; i < 4000; i++) o[i] += noise() * 0.5 * Math.exp(-i / 600); });
fx("whoosh", 0.35, (o) => { let lp = 0; for (let i = 0; i < o.length; i++) { lp += (noise() - lp) * 0.15; o[i] = lp * Math.sin(Math.PI * i / o.length); } });
fx("chime", 0.9, (o) => { for (const m of [76, 79, 84]) tone(o, 0, 0.9, hz(m), 0.4); });
console.log(`bed.wav ${(bed.length / SR).toFixed(1)} s at ${ad.bpm} BPM, plus pop, tick, stamp, whoosh, chime`);
