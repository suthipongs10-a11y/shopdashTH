// QA server without Playwright: serves demo/ like `npm run serve`, plus
//   /__qa/<file>          files from tools/qa/ (e.g. /__qa/inpage.js, the in-page frame helper)
//   POST /__qa/save/<name>.png   body = a PNG data URL -> written to qa-out/<name>.png
// Use it from any browser (e.g. the desktop app's browser pane, even while the pane is hidden):
//   node tools/qa/serve.js [port]      then in the page:  await import('/__qa/inpage.js')
const http = require("http"), fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..", "..");
const DEMO = path.join(ROOT, "demo"), QA = __dirname, OUT = path.join(ROOT, "qa-out");
const PORT = +(process.argv[2] || process.env.PORT || 8000);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".css": "text/css" };
fs.mkdirSync(OUT, { recursive: true });
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (req.method === "POST" && url.startsWith("/__qa/save/")) {
    const name = path.basename(url.slice("/__qa/save/".length)).replace(/[^\w.-]/g, "_");
    let body = ""; req.on("data", c => { body += c; });
    req.on("end", () => {
      const b64 = body.replace(/^data:image\/png;base64,/, "");
      fs.writeFileSync(path.join(OUT, name.endsWith(".png") ? name : name + ".png"), Buffer.from(b64, "base64"));
      res.writeHead(200, { "content-type": "text/plain" }); res.end("saved " + name);
    });
    return;
  }
  const base = url.startsWith("/__qa/") ? QA : DEMO, rel = url.startsWith("/__qa/") ? url.slice(6) : url;
  const file = path.join(base, rel === "/" || rel === "" ? "index.html" : rel);
  if (!file.startsWith(base) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`demo + QA helpers on http://localhost:${PORT}/  (frames saved to ${OUT})`));
