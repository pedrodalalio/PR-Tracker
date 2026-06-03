// Gera os screenshots do README automaticamente.
//
// Pré-requisitos: frontend (5173) e backend (3000) no ar, e o navegador do
// Playwright instalado (`npx playwright install chromium`).
//
// Uso: node screenshots.mjs
//
// Entra como visitante (conta demo já populada), percorre as telas principais
// em desktop e celular, nos temas claro e escuro, e salva em docs/screenshots/.
import { chromium, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdir } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR =
  process.env.OUT_DIR || resolve(__dirname, "../../docs/screenshots");
const BASE = process.env.FRONT_URL || "http://localhost:5173";

const THEMES = ["light", "dark"];

const TARGETS = [
  {
    desktop: { name: "Desktop Chrome", viewport: { width: 1280, height: 800 } },
  },
  { mobile: { ...devices["iPhone 13"] } },
];

// Telas a capturar. `path` pode ser uma função async(page) -> string quando a
// rota depende de dados (ex.: id de uma corrida).
const PAGES = [
  { name: "home", path: "/", settle: 1500 },
  { name: "progress", path: "/progress", settle: 1800 },
  { name: "calendar", path: "/calendar", settle: 1500 },
  {
    name: "run",
    settle: 2800, // tiles do mapa Leaflet
    path: async (page) => {
      const id = await page.evaluate(async () => {
        const token = localStorage.getItem("pr-tracker:token");
        const res = await fetch("http://localhost:3000/runs", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const runs = data.runs ?? data;
        return runs[0]?.id ?? null;
      });
      return id ? `/runs/${id}` : null;
    },
  },
];

async function loginAsDemo(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Entrar como visitante" }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 20000 });
  await page.waitForLoadState("networkidle");
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  let count = 0;

  for (const theme of THEMES) {
    for (const target of TARGETS) {
      const [device, config] = Object.entries(target)[0];
      const context = await browser.newContext({
        ...config,
        deviceScaleFactor: config.deviceScaleFactor ?? 2,
      });
      // Define o tema antes do app montar (ele lê do localStorage no boot).
      await context.addInitScript((t) => {
        localStorage.setItem("pr-tracker-theme", t);
      }, theme);

      // No desktop a sidebar é `h-dvh sticky`: num print fullPage ela termina no
      // meio da imagem e o card de conta "flutua". Esticamos ela até a altura
      // total da página. Injetado ANTES da renderização (não depois), pra não
      // causar reflow que reanima/zera os gráficos do Recharts.
      if (device === "desktop") {
        await context.addInitScript(() => {
          const apply = () => {
            const style = document.createElement("style");
            style.textContent =
              "aside { align-self: stretch !important; height: auto !important; position: static !important; }";
            document.head.appendChild(style);
          };
          if (document.head) apply();
          else document.addEventListener("DOMContentLoaded", apply);
        });
      }

      const page = await context.newPage();
      await loginAsDemo(page);

      for (const target of PAGES) {
        const path =
          typeof target.path === "function"
            ? await target.path(page)
            : target.path;
        if (!path) {
          console.warn(`  ! pulando ${target.name} (${theme}/${device}): sem rota`);
          continue;
        }
        await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
        if (device === "desktop") {
          // Em vez de `fullPage` (que redimensiona o viewport no momento do
          // print e reanima/zera os gráficos do Recharts), dimensionamos o
          // viewport pra altura total ANTES do settle. Assim os gráficos
          // animam uma vez, no tamanho final, e não há resize depois.
          await page.waitForTimeout(400);
          const h = await page.evaluate(() => document.body.scrollHeight);
          await page.setViewportSize({ width: 1280, height: Math.ceil(h) });
        }
        await page.waitForTimeout(target.settle ?? 1200);
        const file = `${OUT_DIR}/${target.name}-${theme}-${device}.png`;
        // Celular: só o viewport, pra ficar com cara de tela de app.
        await page.screenshot({ path: file });
        count++;
        console.log(`  ✓ ${target.name}-${theme}-${device}.png`);
      }

      await context.close();
    }
  }

  await browser.close();
  console.log(`\nPronto: ${count} screenshots em ${OUT_DIR}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
