import * as fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "url";
import metaData from "./metadata.js";

// PUBLIC MAPPA STATIKUS FÁJLKISZOLGÁLÁS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// --- BEÁLLÍTÁSOK ---
const SRC_DIR = "./src"; // Itt vannak az aloldalaid (pl. index.html, rolunk.html)
const PARTIALS_DIR = "./partials"; // Itt a header.html és footer.html
const DIST_DIR = "./dist"; // Ide kerül a kész, statikus weboldal

// 1. FUNKCIÓ: A "Legózás" (Build folyamat)
function buildPage(pageName) {
  let header = fs.readFileSync(path.join(PARTIALS_DIR, "header.html"), "utf8");
  const footer = fs.readFileSync(
    path.join(PARTIALS_DIR, "footer.html"),
    "utf8",
  );
  let content = fs.readFileSync(
    path.join(SRC_DIR, `${pageName}.html`),
    "utf8",
  );

  // Alapértelmezett adatok, ha valami kimaradna az objektumból
  const data = metaData[pageName] || {
    title: "Tücsi Canine Physio",
    description: "",
    date: "",
  };

  // Helyőrzők cseréje
  header = header
    .replace("{{TITLE}}", data.title)
    .replace("{{DESCRIPTION}}", data.description);

  if (content.includes("{{DATE}}") && data.date) {
    content = content.replace("{{DATE}}", formatToISO(data.date));
}

  // Egyszerű csere: a tartalomba beillesztjük a részeket
  return `${header}\n${content}\n${footer}`;
}

// 2. MÓD: BUILD (Statikus fájlok gyártása)
if (process.argv[2] === "build") {
  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR);

  const pages = fs.readdirSync(SRC_DIR).filter((f) => f.endsWith(".html"));
  pages.forEach((file) => {
    const html = buildPage(file.replace(".html", ""));
    fs.writeFileSync(path.join(DIST_DIR, file), html);
    console.log(`✔ Kész: ${file}`);
  });
  console.log("--- A statikus oldal legyártva a /dist mappába! ---");

  if (fs.existsSync("./public")) {
    fs.cpSync("./public", DIST_DIR, { recursive: true });
    console.log("✔ Statikus fájlok (CSS/JS) átmásolva.");
  }
  console.log("--- A stílusok átmásolva! ---");
}

// 3. MÓD: SSR (Csak a játék kedvéért, élőben generálja)
else {
  //const http = require('http');

  http
    .createServer((req, res) => {
      // Statikus fájlok a /public mappából
      if (
        req.url.startsWith("/css/") ||
        req.url.startsWith("/js/") ||
        req.url.startsWith("/images/")
      ) {
        const filePath = path.join(__dirname, "public", req.url);
        const extname = path.extname(filePath);
        const contentType = mimeTypes[extname] || "application/octet-stream";

        fs.readFile(filePath, (err, content) => {
          if (err) {
            res.writeHead(404);
            res.end("404 Not Found");
          } else {
            res.writeHead(200, { "Content-Type": contentType });
            res.end(content);
          }
        });
        return;
      }

      try {
        const page = req.url === "/" ? "index" : req.url.replace("/", "");
        //console.log('page '+page)
        const html = buildPage(page);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
      } catch (e) {
        res.writeHead(404);
        console.log({ e });
        res.end("Hiba: Az oldal nem található.");
      }
    })
    .listen(3000, () =>
      console.log("SSR Mód: Figyelek a http://localhost:3000 címen..."),
    );
}

function formatToISO(dateStr) {
  // A pontokat kötőjelre cseréljük: 2024.02.09 -> 2024-02-09
  const formattedDate = dateStr.replace(/\./g, "-");

  // Hozzáfűzzük a fix időpontot és az eltolást
  return `<p>
  Published: 
  <time datetime="${formattedDate}T08:00:00+00:00" itemprop="datePublished">
    ${dateStr}
  </time>
</p>`;
}
