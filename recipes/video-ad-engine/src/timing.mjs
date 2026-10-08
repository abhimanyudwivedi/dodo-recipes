// The beat grid. Every cut and every sound sits on it, so the edit feels musical without hand-syncing.
export const framesPerBeat = (bpm, fps) => (60 / bpm) * fps;

/** Start frame and length of each shot, in whole frames, rounded from the beat grid. */
export function layout(ad) {
  const fpb = framesPerBeat(ad.bpm, ad.fps);
  let beat = 0;
  const shots = ad.shots.map((s) => {
    const from = Math.round(beat * fpb), to = Math.round((beat + s.beats) * fpb);
    beat += s.beats;
    return { ...s, from, frames: to - from, beatStart: beat - s.beats };
  });
  return { shots, totalFrames: Math.round(beat * fpb), totalBeats: beat, fpb };
}

/** The ad with one hook swapped in. Only the first shot changes between variants. */
export function withHook(ad, hookId) {
  const hook = ad.hooks.find((h) => h.id === hookId) ?? ad.hooks[0];
  return { ...ad, hook, shots: ad.shots.map((s) => (s.graphic === "hook" ? { ...s, line: hook.words.join(" "), words: hook.words } : s)) };
}
