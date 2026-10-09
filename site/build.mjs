// Builds one page per recipe from its README, in the gallery's design.
//   npm run build   ->  site/recipes/<name>.html
// The README stays the single source; re-run after editing one.
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "site/recipes");
// Set to the public repo once it exists, e.g. "https://github.com/<user>/<repo>/blob/main".
// Until then, file links point at the local files.
const REPO_URL = process.env.REPO_URL ?? "";

const RECIPES = [
  { dir: "cold-email-engine", tag: "Outreach", color: "#00ad64", tint: "#e6fbf2" },
  { dir: "video-ad-engine", tag: "Ads", color: "#1264ff", tint: "#e7f0ff" },
  { dir: "daily-report-email", tag: "Retention", color: "#e83439", tint: "#fdedf8" },
];

const slug = (t) => t.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function files(dir) {
  const out = [];
  const walk = (d) => {
    for (const f of fs.readdirSync(path.join(ROOT, "recipes", dir, d), { withFileTypes: true })) {
      if (["node_modules", "out", "audio", "drafts", "preview.html"].includes(f.name) || f.name.startsWith(".") && f.name !== ".env.example") continue;
      const rel = path.join(d, f.name);
      if (f.isDirectory()) walk(rel); else if (!/lock|\.wav$|\.mp4$/.test(f.name)) out.push(rel);
    }
  };
  walk("");
  return out.sort((a, b) => (a.split("/").length - b.split("/").length) || a.localeCompare(b));
}

const css = fs.readFileSync(path.join(ROOT, "site/index.html"), "utf8").match(/<style>([\s\S]*?)<\/style>/)[1];
const pageCss = `
.doc{display:grid;grid-template-columns:240px minmax(0,1fr);gap:56px;padding:64px 48px 96px}
.toc{position:sticky;top:88px;align-self:start;font-size:14px}
.toc b{display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--soft);margin-bottom:12px}
.toc a{display:block;padding:6px 0 6px 12px;border-left:2px solid var(--line);color:#555}
.toc a:hover{border-color:var(--c);color:var(--ink)}
.toc .files{margin-top:28px}
.toc .files a{font-family:"JetBrains Mono",monospace;font-size:12.5px;border:none;padding:3px 0}
.rh{padding:72px 48px 56px;background:var(--tint);border-bottom:1px solid var(--line);position:relative;overflow:hidden}
.rh::before{content:"";position:absolute;inset:0;background-image:radial-gradient(rgba(0,22,13,.12) 1px,transparent 1.2px);background-size:22px 22px;-webkit-mask-image:linear-gradient(90deg,transparent,#000);mask-image:linear-gradient(90deg,transparent,#000)}
.rh>*{position:relative}
.crumb{font-size:14px;color:var(--muted)}.crumb a:hover{color:var(--ink)}
.rh h1{font-size:clamp(34px,4.6vw,58px);line-height:1.05;max-width:860px;margin:18px 0 16px}
.rh p{font-size:19px;color:#3d4743;max-width:720px;margin:0}
.md{min-width:0;max-width:760px;overflow-x:clip}
.md h2{font-size:32px;line-height:1.15;margin:56px 0 16px;padding-top:8px;scroll-margin-top:90px}
.md h2:first-child{margin-top:0}
.md h2 .n{display:inline-block;font:500 14px "JetBrains Mono",monospace;color:var(--c);background:var(--tint);border-radius:6px;padding:3px 8px;margin-right:12px;vertical-align:middle;letter-spacing:0}
.md h3{font-size:21px;margin:32px 0 10px}
.md p,.md li{color:#2c3531;font-size:16.5px}
.md li{margin:6px 0}
.md a{color:var(--c);text-decoration:underline;text-underline-offset:3px}
.md code{font:13.5px "JetBrains Mono",monospace;background:#f2f3f2;border-radius:5px;padding:2px 6px;overflow-wrap:anywhere}
.md pre code{overflow-wrap:normal}
.md pre{background:#0e0f12;color:#d6d9de;border-radius:12px;padding:18px 20px;overflow-x:auto;box-shadow:0 10px 30px rgba(0,0,0,.08)}
.md pre code{background:none;padding:0;color:inherit;font-size:13px;line-height:1.65}
.md table{width:100%;border-collapse:collapse;font-size:15px;margin:18px 0;display:block;overflow-x:auto}
.md th{text-align:left;font-weight:600;border-bottom:2px solid var(--ink);padding:10px 12px 10px 0}
.md td{border-bottom:1px solid var(--line);padding:10px 12px 10px 0;vertical-align:top;color:#2c3531}
.md ol li::marker{color:var(--c);font-weight:600}
.dodo-step{background:var(--lime);border-radius:14px;padding:4px 24px 14px;margin-top:16px}
.dodo-step h2{margin-top:20px}
.pn{display:flex;justify-content:space-between;gap:16px;border-top:1px solid var(--line);margin-top:64px;padding-top:24px;font-weight:600}
.pn a:hover{color:var(--c)}
@media (max-width:960px){.doc{grid-template-columns:minmax(0,1fr);padding:40px 20px 64px;gap:24px}.toc{position:static}.rh{padding:48px 20px 40px}}
`;

fs.mkdirSync(OUT, { recursive: true });
RECIPES.forEach((r, i) => {
  const md = fs.readFileSync(path.join(ROOT, "recipes", r.dir, "README.md"), "utf8");
  const [, title] = md.match(/^# (.+)$/m);
  const afterTitle = md.replace(/^# .+\n/m, "");
  const intro = afterTitle.split(/\n## /)[0].trim();
  const rest = afterTitle.slice(afterTitle.indexOf("\n## "));
  let html = marked.parse(rest);
  const toc = [];
  html = html.replace(/<h2>(.+?)<\/h2>/g, (_, inner) => {
    const m = inner.match(/^(\d+)\.\s*(.+)$/);
    const text = m ? m[2] : inner;
    const id = slug(text);
    toc.push({ id, text: text.replace(/<[^>]+>/g, "") });
    return `<h2 id="${id}">${m ? `<span class="n">0${m[1]}</span>` : ""}${text}</h2>`;
  });
  // Wrap the Dodo section in a lime panel so it stands out the way the gallery promises.
  html = html.replace(/(<h2 id="[^"]*dodo[^"]*">[\s\S]*?)(?=<h2 |$)/, '<div class="dodo-step">$1</div>');
  html = html.replace(/href="\.\.\/recipes\/([^"]+)"/g, 'href="$1.html"');
  const fileLinks = files(r.dir).map((f) => {
    const href = REPO_URL ? `${REPO_URL}/recipes/${r.dir}/${f}` : `../../recipes/${r.dir}/${f}`;
    return `<a href="${href}">${esc(f)}</a>`;
  }).join("");
  const prev = RECIPES[i - 1], next = RECIPES[i + 1];
  const titleOf = (x) => fs.readFileSync(path.join(ROOT, "recipes", x.dir, "README.md"), "utf8").match(/^# (.+)$/m)[1];
  const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(intro.replace(/\s+/g, " ").slice(0, 200))}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Inter+Tight:wght@500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${css}${pageCss}:root{--c:${r.color};--tint:${r.tint}}</style></head>
<body>
<header><div class="nav">
  <a class="brand" href="../index.html"><i>↗</i>Build it</a>
  <nav class="links"><a href="../index.html#recipes">Recipes</a><a href="../index.html#how">How a recipe works</a>
  <a class="btn lime" href="https://dodopayments.com/?utm_source=recipes&amp;utm_medium=gallery&amp;utm_campaign=recipe-${r.dir}">Start with Dodo</a></nav>
</div></header>
<main class="frame">
<section class="rh">
  <div class="crumb"><a href="../index.html#recipes">Recipes</a> / <span class="tag" style="--c:${r.color}">${r.tag}</span></div>
  <h1>${esc(title)}</h1>
  <p>${marked.parseInline(intro.replace(/\s+/g, " "))}</p>
</section>
<div class="doc">
  <aside class="toc"><b>On this page</b>${toc.map((t) => `<a href="#${t.id}">${t.text}</a>`).join("")}
    <div class="files"><b>Files</b>${fileLinks}</div></aside>
  <article class="md">${html}
    <div class="pn"><span>${prev ? `<a href="${prev.dir}.html">← ${esc(titleOf(prev))}</a>` : `<a href="../index.html#recipes">← All recipes</a>`}</span>
    <span>${next ? `<a href="${next.dir}.html">${esc(titleOf(next))} →</a>` : `<a href="../index.html#recipes">All recipes →</a>`}</span></div>
  </article>
</div>
</main>
<footer><span>Written by the founder of Zipply, a Dodo Payments merchant. Code is MIT licensed.</span><span>An independent project. Not affiliated with or endorsed by Dodo Payments.</span></footer>
</body></html>`;
  fs.writeFileSync(path.join(OUT, `${r.dir}.html`), page);
  console.log(`site/recipes/${r.dir}.html  (${toc.length} sections, ${files(r.dir).length} files)`);
});
