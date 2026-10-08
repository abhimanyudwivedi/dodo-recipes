// node scripts/audit.mjs ads/example.json   -> exits 1 with every problem listed, before any render
import fs from "node:fs";
import { audit } from "../src/audit.mjs";
const file = process.argv[2] ?? "ads/example.json";
const problems = audit(JSON.parse(fs.readFileSync(file, "utf8")));
if (problems.length) { console.error(`${file}: ${problems.length} problem(s)\n` + problems.map((p) => `  - ${p}`).join("\n")); process.exit(1); }
console.log(`${file}: passes`);
