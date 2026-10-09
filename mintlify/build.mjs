// Turns each recipe README into a Mintlify page (the docs platform Dodo uses), so the recipes can be
// dropped into Dodo's docs as a "Recipes" tab. README stays the single source.
//   node mintlify/build.mjs   ->  mintlify/recipes/*.mdx
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "mintlify/recipes");
const RECIPES = [
  { dir: "cold-email-engine", icon: "envelope", short: "Cold-email engine" },
  { dir: "video-ad-engine", icon: "clapperboard", short: "Video ad engine" },
  { dir: "daily-report-email", icon: "inbox", short: "Daily report email" },
  { dir: "customer-alerts", icon: "bell", short: "Customer alerts" },
];

// MDX treats { and < as code; escape them outside code spans and fences.
function escapeMdx(text) {
  return text.split(/(```[\s\S]*?```)/g).map((chunk, i) => i % 2 ? chunk
    : chunk.split(/(`[^`\n]*`)/g).map((c, j) => j % 2 ? c : c.replace(/\{/g, "\\{").replace(/\}/g, "\\}").replace(/<(?![A-Z/])/g, "&lt;")).join("")).join("");
}
const sections = (md) => {
  const parts = md.split(/\n(?=## )/);
  return { head: parts[0], list: parts.slice(1).map((p) => ({ title: p.match(/^## (.+)/)[1], body: p.replace(/^## .+\n/, "").trim() })) };
};

// Part 4: the numbered prompts become <Steps>; the "Run it" block follows as-is.
function steps(body) {
  const [prompts, ...rest] = body.split(/\n(?=### )/);
  const items = [...prompts.matchAll(/^\d+\. \*\*(.+?)\.?\*\* ([\s\S]*?)(?=\n\d+\. \*\*|\s*$(?![\s\S]))/gm)];
  if (!items.length) return body;
  const intro = prompts.slice(0, prompts.search(/^\d+\. \*\*/m)).trim();
  const out = `${intro}\n\n<Steps>\n${items.map(([, t, txt]) => {
    const [prompt, produces] = txt.replace(/\s+/g, " ").trim().split(/ → /);
    return `  <Step title="${t}">\n    ${prompt}${produces ? `\n\n    **Produces:** ${produces}` : ""}\n  </Step>`;
  }).join("\n")}\n</Steps>`;
  return [out, ...rest].join("\n\n");
}
// Part 5: each safety rule becomes an accordion, titled by its bold lead.
function accordions(body) {
  const items = [...body.matchAll(/^- \*\*(.+?)\*\*\s*([\s\S]*?)(?=\n- \*\*|\s*$(?![\s\S]))/gm)];
  if (!items.length) return body;
  const intro = body.slice(0, body.search(/^- \*\*/m)).trim();
  return `${intro}\n\n<AccordionGroup>\n${items.map(([, t, txt]) => `  <Accordion title="${t.replace(/"/g, "'").replace(/\.$/, "")}">\n    ${txt.replace(/\s+/g, " ").trim()}\n  </Accordion>`).join("\n")}\n</AccordionGroup>`;
}

fs.mkdirSync(OUT, { recursive: true });
for (const r of RECIPES) {
  const md = fs.readFileSync(path.join(ROOT, "recipes", r.dir, "README.md"), "utf8");
  const title = md.match(/^# (.+)$/m)[1];
  const { head, list } = sections(md.replace(/^# .+\n/m, ""));
  const description = head.trim().replace(/\s+/g, " ").replace(/"/g, "'");
  const body = list.map(({ title: t, body: b }) => {
    const name = t.replace(/^\d+\.\s*/, "");
    let content = escapeMdx(b);
    if (/^4\./.test(t)) content = steps(content);
    if (/^5\./.test(t)) content = accordions(content);
    if (/^6\./.test(t)) content = `<Tip>\n**Every recipe ends here.** Dodo is the merchant of record, so tax and payment methods abroad are handled from the first sale.\n</Tip>\n\n${content}`;
    return `## ${name}\n\n${content}`;
  }).join("\n\n");
  const mdx = `---\ntitle: "${title.replace(/"/g, "'")}"\nsidebarTitle: "${r.short}"\ndescription: "${description}"\nicon: "${r.icon}"\n---\n\n${body}\n`;
  fs.writeFileSync(path.join(OUT, `${r.dir}.mdx`), mdx);
  console.log(`recipes/${r.dir}.mdx`);
}
