// Turns the single-file build (dist/index.html) into an Artifact page body: the
// artifact host supplies <!doctype>/<html>/<head>/<body> itself.
import { readFileSync, writeFileSync } from "node:fs";

const [src = "dist/index.html", out = "dist/artifact.html"] = process.argv.slice(2);
const html = readFileSync(src, "utf8");
const pick = (re) => [...html.matchAll(re)].map((m) => m[0]);
const title = html.match(/<title>[\s\S]*?<\/title>/)?.[0] ?? "<title>ROCKET BREAKERS</title>";
const styles = pick(/<style[\s\S]*?<\/style>/g);
const scripts = pick(/<script[\s\S]*?<\/script>/g);
const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1] ?? "";
const bodyNoScripts = body.replace(/<script[\s\S]*?<\/script>/g, "");
writeFileSync(out, [title, '<meta name="theme-color" content="#0b1424">', ...styles, bodyNoScripts.trim(), ...scripts].join("\n"));
console.log(`wrote ${out} (${(readFileSync(out).length / 1024).toFixed(0)} KB, ${styles.length} style, ${scripts.length} script)`);
