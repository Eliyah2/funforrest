// Lokale "productie"-server voor dist/, met dezelfde schoon-URL's als Vercel
// (/login -> dist/login.html). Gebruik:  node tools/serve-dist.js [poort]
const http = require("http");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "dist");
const port = Number(process.argv[2] || 8090);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
};

function send(res, filePath, status) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 - niet gevonden");
      return;
    }
    res.writeHead(status || 200, {
      "Content-Type": TYPES[path.extname(filePath)] || "application/octet-stream",
    });
    res.end(data);
  });
}

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split("?")[0]);
    const clean = url.endsWith("/") ? url.slice(0, -1) : url;
    const candidates = [
      path.join(root, clean),
      path.join(root, `${clean}.html`),
      path.join(root, clean, "index.html"),
      url === "/" ? path.join(root, "index.html") : null,
    ].filter(Boolean);

    for (const candidate of candidates) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        send(res, candidate);
        return;
      }
    }
    // SPA-terugval zoals de rewrite van de Expo/Vercel-docs
    send(res, path.join(root, "index.html"), 200);
  })
  .listen(port, () => {
    console.log(`Productie-preview: http://localhost:${port}`);
  });
