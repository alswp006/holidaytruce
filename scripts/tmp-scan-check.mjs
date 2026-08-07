import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { scanContent } from "./forbidden-patterns.mjs";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if ([".tsx", ".ts", ".jsx", ".css"].includes(extname(name))) out.push(full);
  }
  return out;
}

const root = process.cwd();
const srcDir = join(root, "src");
const out = [];
for (const file of walk(srcDir)) {
  const rel = file.slice(root.length + 1);
  for (const v of scanContent(readFileSync(file, "utf8"), rel)) out.push({ ...v, file: rel });
}
console.log(JSON.stringify(out, null, 2));
console.log("TOTAL:", out.length);
