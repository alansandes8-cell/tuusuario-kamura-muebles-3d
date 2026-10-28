/**
 * Genera las imágenes del catálogo (public/renders) a partir de los modelos 3D reales.
 * Requiere el servidor de desarrollo corriendo (npm run dev) y Playwright.
 * Uso: node scripts/render-catalog.js [http://localhost:3000]
 */
const { chromium } = require("playwright");
const path = require("node:path");

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = path.join(__dirname, "..", "public", "renders");
const SHOTS = [
  { file: "mesa", slug: "mesas", plantilla: "nordica", madera: "petiribi" },
  { file: "cama", slug: "bases-de-cama", plantilla: "listones", madera: "guatambu" },
  { file: "rack", slug: "racks-de-tv", plantilla: "nordico", madera: "lapacho" },
  { file: "escritorio", slug: "escritorios", plantilla: "con-cajonera", madera: "paraiso" },
  { file: "biblioteca", slug: "bibliotecas", plantilla: "asimetrica", madera: "incienso" },
  { file: "ratona", slug: "mesas-ratonas", plantilla: "redonda", madera: "guayubira" },
  { file: "barra", slug: "barras-e-islas", plantilla: "barra-patas", madera: "petiribi" },
  { file: "vajillero", slug: "vajilleros", plantilla: "vitrina", madera: "lapacho" },
  { file: "recibidor", slug: "recibidores", plantilla: "consola-cajones", madera: "paraiso" },
  { file: "hero", slug: "mesas", plantilla: "clasica", madera: "incienso", width: 1200, height: 960 },
];

(async () => {
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  for (const s of SHOTS) {
    const page = await browser.newPage({ viewport: { width: s.width || 960, height: s.height || 720 }, deviceScaleFactor: 1 });
    await page.goto(`${BASE}/render/${s.slug}?plantilla=${s.plantilla}&madera=${s.madera}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(OUT, `${s.file}.jpg`), type: "jpeg", quality: 84 });
    await page.close();
    console.log("✓", s.file);
  }
  await browser.close();
})();
