// Mermaid diagrams are rendered to SVG at build time, once per theme, so pages ship no diagram runtime.
//
// Rendering needs a headless Chromium (Playwright). Results are cached in diagrams/<hash>.json, which is
// committed: a build whose diagrams are all cached needs no browser. The hash covers the diagram source, the
// Mermaid version and the theme below, so any change to one of them renders afresh.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, "../..");
const CACHE = path.join(ROOT, "diagrams");
const MERMAID_VERSION = require("mermaid/package.json").version;

const font = "Montserrat, ui-sans-serif, system-ui, sans-serif";
export const THEMES = {
  light: {
    darkMode: false,
    fontFamily: font,
    fontSize: "14px",
    background: "#ffffff",
    primaryColor: "#efeafe",
    primaryBorderColor: "#6d4aff",
    primaryTextColor: "#14151b",
    secondaryColor: "#f7f7fa",
    tertiaryColor: "#ffffff",
    lineColor: "#5a5d6b",
    textColor: "#14151b",
    actorBkg: "#efeafe",
    actorBorder: "#6d4aff",
    actorTextColor: "#14151b",
    actorLineColor: "#c9c9d6",
    signalColor: "#14151b",
    signalTextColor: "#14151b",
    labelBoxBkgColor: "#f7f7fa",
    labelBoxBorderColor: "#c9c9d6",
    labelTextColor: "#14151b",
    loopTextColor: "#14151b",
    noteBkgColor: "#f4f3fb",
    noteBorderColor: "#d9d6ea",
    noteTextColor: "#14151b",
    activationBkgColor: "#efeafe",
    activationBorderColor: "#6d4aff",
    edgeLabelBackground: "#ffffff",
    clusterBkg: "#f7f7fa",
    clusterBorder: "#d9d6ea",
  },
  dark: {
    darkMode: true,
    fontFamily: font,
    fontSize: "14px",
    background: "#111219",
    primaryColor: "#221d3a",
    primaryBorderColor: "#a48bff",
    primaryTextColor: "#eceef4",
    secondaryColor: "#171922",
    tertiaryColor: "#111219",
    lineColor: "#9a9db0",
    textColor: "#eceef4",
    actorBkg: "#221d3a",
    actorBorder: "#a48bff",
    actorTextColor: "#eceef4",
    actorLineColor: "#3a3d52",
    signalColor: "#eceef4",
    signalTextColor: "#eceef4",
    labelBoxBkgColor: "#171922",
    labelBoxBorderColor: "#3a3d52",
    labelTextColor: "#eceef4",
    loopTextColor: "#eceef4",
    noteBkgColor: "#181a24",
    noteBorderColor: "#2e3142",
    noteTextColor: "#eceef4",
    activationBkgColor: "#221d3a",
    activationBorderColor: "#a48bff",
    edgeLabelBackground: "#111219",
    clusterBkg: "#171922",
    clusterBorder: "#2e3142",
  },
};

export function diagramHash(code) {
  return crypto.createHash("sha256").update(JSON.stringify({ code, MERMAID_VERSION, THEMES })).digest("hex").slice(0, 16);
}

const cachePath = (hash) => path.join(CACHE, `${hash}.json`);

/** Render every diagram not yet cached. Returns { hash: { light, dark } } for all of them. */
export async function renderDiagrams(codes) {
  const unique = [...new Set(codes)];
  const missing = unique.filter((c) => !fs.existsSync(cachePath(diagramHash(c))));
  if (missing.length) await renderMissing(missing);
  const out = {};
  for (const c of unique) out[diagramHash(c)] = JSON.parse(fs.readFileSync(cachePath(diagramHash(c)), "utf8"));
  return out;
}

async function renderMissing(codes) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error(`${codes.length} Mermaid diagram(s) changed upstream and are not in diagrams/. Run the build once where Playwright's Chromium is installed (npx playwright install chromium) and commit diagrams/.`);
  }
  const browser = await chromium.launch().catch((e) => {
    throw new Error(`Cannot launch Chromium to render ${codes.length} new Mermaid diagram(s): ${e.message}\nRun the build locally and commit diagrams/.`);
  });
  try {
    const page = await browser.newPage();
    const woff = (w) => fs.readFileSync(require.resolve(`@fontsource/montserrat/files/montserrat-latin-${w}-normal.woff2`)).toString("base64");
    await page.setContent(`<!doctype html><html><head><style>
      @font-face{font-family:Montserrat;font-weight:400;src:url(data:font/woff2;base64,${woff(400)}) format("woff2")}
      @font-face{font-family:Montserrat;font-weight:600;src:url(data:font/woff2;base64,${woff(600)}) format("woff2")}
      body{font-family:Montserrat}</style></head><body><span style="font-weight:400">a</span><b style="font-weight:600">b</b></body></html>`);
    await page.addScriptTag({ path: require.resolve("mermaid/dist/mermaid.min.js") });
    await page.evaluate(() => document.fonts.ready);
    fs.mkdirSync(CACHE, { recursive: true });
    for (const code of codes) {
      const hash = diagramHash(code);
      const result = {};
      for (const [name, themeVariables] of Object.entries(THEMES)) {
        result[name] = await page.evaluate(
          async ({ code, id, themeVariables }) => {
            mermaid.initialize({ startOnLoad: false, theme: "base", themeVariables, securityLevel: "strict", fontFamily: themeVariables.fontFamily, sequence: { useMaxWidth: true }, flowchart: { useMaxWidth: true, htmlLabels: false } });
            const { svg } = await mermaid.render(id, code);
            return svg;
          },
          { code, id: `mmd-${hash}-${name}`, themeVariables },
        );
      }
      result.source = code;
      fs.writeFileSync(cachePath(hash), JSON.stringify(result, null, 1) + "\n");
      console.log(`  rendered diagram ${hash}`);
    }
  } finally {
    await browser.close();
  }
}
