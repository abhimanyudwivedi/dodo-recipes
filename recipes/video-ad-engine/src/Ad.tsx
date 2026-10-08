// The scenes. Each graphic type is one component; a shot in the JSON picks one.
// Rule: every line on screen has a graphic that enters on the beat, and every graphic event has one sound.
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { layout } from "./timing.mjs";

export type AdProps = { ad: any };
const FONT = "Inter, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Sfx: React.FC<{ at: number; name: string; vol?: number }> = ({ at, name, vol = 0.5 }) => (
  <Sequence from={Math.round(at)} durationInFrames={30}><Audio src={staticFile(`audio/${name}.wav`)} volume={vol} /></Sequence>
);
const useIn = (at: number) => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping: 14, stiffness: 180 } });
};

// One word per beat, the last one optionally in the accent colour.
const Words: React.FC<{ words: string[]; fpb: number; c: any; accentLast?: boolean; size?: number }> = ({ words, fpb, c, accentLast, size = 150 }) => (
  <AbsoluteFill style={{ justifyContent: "center", padding: 90 }}>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0 34px" }}>
      {words.map((w, i) => <Word key={i} at={i * fpb} w={w} color={accentLast && i === words.length - 1 ? c.accent : c.ink} size={size} />)}
    </div>
    {words.map((_, i) => <Sfx key={i} at={i * fpb} name="pop" vol={0.45} />)}
  </AbsoluteFill>
);
const Word: React.FC<{ at: number; w: string; color: string; size: number }> = ({ at, w, color, size }) => {
  const s = useIn(at);
  return <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: size, letterSpacing: "-0.05em", lineHeight: 1.02, color, opacity: s, transform: `translateY(${(1 - s) * 60}px)` }}>{w}</span>;
};

// A number that counts up over two beats, ticking as it goes.
const Counter: React.FC<{ value: number; label: string; fpb: number; c: any }> = ({ value, label, fpb, c }) => {
  const frame = useCurrentFrame();
  const n = Math.round(interpolate(frame, [0, fpb * 2], [0, value], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 }));
  const s = useIn(fpb * 2);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: FONT, color: c.ink }}>
      <div style={{ fontSize: 380, fontWeight: 900, letterSpacing: "-0.06em", lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 64, fontWeight: 700, marginTop: 20, opacity: s, background: c.pop[1], padding: "6px 28px", borderRadius: 18 }}>{label}</div>
      {Array.from({ length: 8 }).map((_, i) => <Sfx key={i} at={(i * fpb * 2) / 8} name="tick" vol={0.25} />)}
      <Sfx at={fpb * 2} name="pop" />
    </AbsoluteFill>
  );
};

// A rubber stamp that slams down on the second beat.
const Stamp: React.FC<{ text: string; caption?: string; fpb: number; c: any }> = ({ text, caption, fpb, c }) => {
  const frame = useCurrentFrame();
  const s = interpolate(frame, [fpb, fpb + 5], [2.4, 1], clamp);
  const o = interpolate(frame, [fpb, fpb + 2], [0, 1], clamp);
  const cap = useIn(fpb * 2);
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", fontFamily: FONT }}>
      <div style={{ opacity: o, transform: `scale(${s}) rotate(-8deg)`, border: `14px solid ${c.accent}`, color: c.accent, fontSize: Math.min(210, Math.floor(1150 / text.length)), fontWeight: 900, padding: "10px 60px", borderRadius: 30, letterSpacing: "0.04em" }}>{text}</div>
      {caption && <div style={{ marginTop: 80, fontSize: 58, fontWeight: 700, color: c.ink, opacity: cap, maxWidth: 820, textAlign: "center" }}>{caption}</div>}
      <Sfx at={fpb} name="stamp" vol={0.8} />
    </AbsoluteFill>
  );
};

const Cta: React.FC<{ ad: any; text: string; fpb: number }> = ({ ad, text, fpb }) => {
  const a = useIn(0), b = useIn(fpb), c = ad.colors;
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", background: c.ink, fontFamily: FONT }}>
      <div style={{ fontSize: 150, fontWeight: 900, color: c.bg, letterSpacing: "-0.05em", opacity: a, transform: `scale(${0.85 + 0.15 * a})` }}>{ad.product}</div>
      <div style={{ marginTop: 50, fontSize: 64, fontWeight: 800, color: c.ink, background: c.accent, padding: "18px 48px", borderRadius: 999, opacity: b, transform: `translateY(${(1 - b) * 40}px)` }}>{text}</div>
      <div style={{ marginTop: 40, fontSize: 44, color: c.bg, opacity: b * 0.8 }}>{ad.url}</div>
      <Sfx at={0} name="whoosh" vol={0.6} />
      <Sfx at={fpb} name="chime" vol={0.5} />
    </AbsoluteFill>
  );
};

// A colour wipe on every cut, so the cut itself is a visible event on the beat.
const Wipe: React.FC<{ color: string }> = ({ color }) => {
  const frame = useCurrentFrame();
  const x = interpolate(frame, [0, 8], [-130, 130], { ...clamp, easing: (t) => 1 - (1 - t) ** 3 });
  return <div style={{ position: "absolute", inset: "-20%", background: color, transform: `translateX(${x}%) skewX(-16deg)`, opacity: frame < 9 ? 1 : 0 }} />;
};

export const Ad: React.FC<AdProps> = ({ ad }) => {
  const { shots, fpb } = layout(ad);
  const c = ad.colors;
  return (
    <AbsoluteFill style={{ background: c.bg }}>
      <Audio src={staticFile("audio/bed.wav")} volume={0.55} />
      {shots.map((s: any, i: number) => (
        <Sequence key={i} from={s.from} durationInFrames={s.frames}>
          <AbsoluteFill style={{ background: c.bg }}>
            {(s.graphic === "hook" || s.graphic === "words") && <Words words={s.words} fpb={fpb} c={c} accentLast={s.accentLast ?? s.graphic === "hook"} size={s.graphic === "hook" ? 170 : 150} />}
            {s.graphic === "counter" && <Counter value={ad.facts[s.fact].value} label={s.label} fpb={fpb} c={c} />}
            {s.graphic === "stamp" && <Stamp text={s.stamp} caption={s.caption} fpb={fpb} c={c} />}
            {s.graphic === "cta" && <Cta ad={ad} text={s.cta} fpb={fpb} />}
            {i > 0 && <Wipe color={c.pop[i % c.pop.length]} />}
            {i > 0 && <Sfx at={0} name="whoosh" vol={0.3} />}
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
