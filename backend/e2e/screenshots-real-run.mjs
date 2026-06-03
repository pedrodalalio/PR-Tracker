// Captura a tela de Corrida usando uma corrida REAL (conta não-demo), em vez do
// trajeto sintético da demo. Sobrescreve apenas run-{tema}-{device}.png.
//
// Pré-requisito: rodar antes `npx ts-node scripts/pick-real-run.ts` (gera
// /tmp/real-run.json com runId + token), e ter front (5173) e back (3000) no ar.
import { chromium, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../../docs/screenshots");
const BASE = process.env.FRONT_URL || "http://localhost:5173";

const { runId, token, name, distanceKm } = JSON.parse(
  readFileSync("/tmp/real-run.json", "utf8"),
);
console.log(`Corrida real: "${name}" (${distanceKm}km) — ${runId}`);

const THEMES = ["light", "dark"];
const TARGETS = [
  { desktop: { viewport: { width: 1280, height: 800 } } },
  { mobile: { ...devices["iPhone 13"] } },
];

const SIDEBAR_FIX =
  "aside { align-self: stretch !important; height: auto !important; position: static !important; }";

async function run() {
  const browser = await chromium.launch();
  let count = 0;

  for (const theme of THEMES) {
    for (const target of TARGETS) {
      const [device, config] = Object.entries(target)[0];
      const context = await browser.newContext({
        ...config,
        deviceScaleFactor: config.deviceScaleFactor ?? 2,
      });

      // Injeta tema + token de sessão antes do app montar. Com o token no
      // localStorage, o auth-context valida via /auth/me e entra autenticado.
      await context.addInitScript(
        ({ t, tok }) => {
          localStorage.setItem("pr-tracker-theme", t);
          localStorage.setItem("pr-tracker:token", tok);
        },
        { t: theme, tok: token },
      );

      // Esconde a faixa "confirme seu e-mail" (conta real não-verificada) pra
      // um print mais limpo. No desktop, também estica a sidebar. Online, a
      // única [role=status] na tela é essa faixa.
      const css =
        '[role="status"] { display: none !important; }' +
        (device === "desktop" ? " " + SIDEBAR_FIX : "");
      await context.addInitScript((c) => {
        const apply = () => {
          const style = document.createElement("style");
          style.textContent = c;
          document.head.appendChild(style);
        };
        if (document.head) apply();
        else document.addEventListener("DOMContentLoaded", apply);
      }, css);

      const page = await context.newPage();
      await page.goto(`${BASE}/runs/${runId}`, { waitUntil: "networkidle" });
      if (device === "desktop") {
        // Pré-dimensiona o viewport pra altura total antes do settle, pra o
        // print não redimensionar depois (o que zera os gráficos do Recharts).
        await page.waitForTimeout(400);
        const h = await page.evaluate(() => document.body.scrollHeight);
        await page.setViewportSize({ width: 1280, height: Math.ceil(h) });
      }
      // espera os tiles do mapa Leaflet + animação dos gráficos
      await page.waitForTimeout(3500);

      const file = `${OUT_DIR}/run-${theme}-${device}.png`;
      await page.screenshot({ path: file });
      count++;
      console.log(`  ✓ run-${theme}-${device}.png`);

      await context.close();
    }
  }

  await browser.close();
  console.log(`\nPronto: ${count} screenshots de corrida real em ${OUT_DIR}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
