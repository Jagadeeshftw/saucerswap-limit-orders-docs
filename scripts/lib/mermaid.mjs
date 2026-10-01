// Mermaid diagrams are rendered to SVG at build time, once per theme, so pages ship no diagram runtime.
//
// Rendering needs a headless Chromium (Playwright). Results are cached in diagrams/<hash>.json, which is
// committed: a build whose diagrams are all cached needs no browser. The hash covers the diagram source, the
// Mermaid version and the theme below, so any change to one of them renders afresh.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import subsetFont from "subset-font";

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
const woffFile = (w) => fs.readFileSync(require.resolve(`@fontsource/montserrat/files/montserrat-latin-${w}-normal.woff2`));
const woff = (w) => woffFile(w).toString("base64");

/**
 * Write each diagram as a standalone SVG file per theme (served as a lazy <img>, so pages carry no SVG markup),
 * with the Montserrat it was measured in embedded (cut down to the glyphs it uses), since an SVG image cannot
 * use the page's fonts. Returns { hash: { width, height, alt } }.
 */
export async function writeDiagramFiles(rendered, dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const out = {};
  for (const [hash, d] of Object.entries(rendered)) {
    const text = (d.light + d.dark)
      .replace(/<style[\s\S]*?<\/style>/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[e]);
    const glyphs = [...new Set(text + " …")].join("");
    const fontCss = (
      await Promise.all(
        [400, 600].map(async (w) => {
          const font = await subsetFont(woffFile(w), glyphs, { targetFormat: "woff2" });
          return `@font-face{font-family:Montserrat;font-weight:${w};src:url(data:font/woff2;base64,${font.toString("base64")}) format("woff2")}`;
        }),
      )
    ).join("");
    const vb = d.light.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/);
    const width = Math.ceil(Number(vb[3]));
    const height = Math.ceil(Number(vb[4]));
    for (const theme of ["light", "dark"]) {
      const svg = d[theme]
        .replace(/^<svg([^>]*?) width="100%"/, `<svg$1 width="${width}" height="${height}"`)
        .replace(/^<svg([^>]*?) style="max-width: [\d.]+px;"/, "<svg$1")
        .replace(/^(<svg[^>]*>)/, `$1<style>${fontCss}</style>`);
      fs.writeFileSync(path.join(dir, `${hash}-${theme}.svg`), svg);
    }
    out[hash] = { width, height, alt: describeDiagram(d.source) };
  }
  return out;
}

/** Alt text from the diagram source: its kind and the names in it. */
export function describeDiagram(code) {
  const lines = code.split("\n").map((l) => l.trim());
  const kind = lines[0].split(/\s/)[0];
  const names = new Set();
  if (kind === "sequenceDiagram") {
    for (const l of lines) {
      const m = l.match(/^(?:participant|actor)\s+(\S+)(?:\s+as\s+(.+))?$/);
      if (m) names.add(m[2] ?? m[1]);
    }
    return `Sequence diagram between ${[...names].join(", ")}.`;
  }
  if (kind === "stateDiagram-v2" || kind === "stateDiagram") {
    for (const l of lines) for (const m of l.matchAll(/(\w+)\s*-->\s*(\w+)/g)) (names.add(m[1]), names.add(m[2]));
    names.delete("*");
    return `State diagram of ${[...names].join(", ")}.`;
  }
  for (const l of lines) for (const m of l.matchAll(/\w+\s*(?:\[\(?|\(\[?|\{\{?)"?([^\]\)\}"]+)"?/g)) names.add(m[1].trim());
  return `Diagram of ${[...names].join(", ")}.`;
}

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
