// Audit, make the sound, then render one MP4 per hook. Only the first shot differs between them,
// so the hook is the only thing a test of the variants measures.
//   node scripts/render.mjs ads/example.json
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { audit } from "../src/audit.mjs";
import { withHook } from "../src/timing.mjs";

const file = process.argv[2] ?? "ads/example.json";
const ad = JSON.parse(fs.readFileSync(file, "utf8"));
const problems = audit(ad);
if (problems.length) { console.error(problems.map((p) => `- ${p}`).join("\n")); process.exit(1); }
execFileSync("node", ["scripts/gen-audio.mjs", file], { stdio: "inherit" });

const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
fs.mkdirSync("out", { recursive: true });
const base = path.basename(file, ".json");
for (const h of ad.hooks) {
  const inputProps = { ad: withHook(ad, h.id) };
  const composition = await selectComposition({ serveUrl, id: "Ad", inputProps });
  const outputLocation = `out/${base}-${h.id}.mp4`;
  await renderMedia({ composition, serveUrl, codec: "h264", outputLocation, inputProps });
  console.log(`${outputLocation}  (link it with utm_content=${h.id})`);
}
