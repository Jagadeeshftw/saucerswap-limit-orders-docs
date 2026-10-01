// Screenshots at 1440 and 390, light and dark.
//
//   node scripts/screenshots.mjs                         against a fresh `next start` of this build
//   node scripts/screenshots.mjs https://limit-orders.0xo.in   against a deployed site
//
// Writes screenshots/<shot>-<width>-<scheme>.png.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";

const OUT = "screenshots";
fs.mkdirSync(OUT, { recursive: true });
let base = process.argv[2];
let server;
if (!base) {
  base = "http://127.0.0.1:3217";
  try {
    await fetch(base);
    console.error(`something is already listening on ${base}; stop it so the screenshots come from this build`);
    process.exit(1);
  } catch {}
  server = spawn("npx", ["next", "start", "-p", "3217"], { stdio: "ignore", detached: true });
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
}

const shots = [
  { name: "home", path: "/", full: true },
  { name: "content-page", path: "/guide/architecture" },
  { name: "contract-reference", path: "/reference/contract-api" },
  {
    name: "search-open",
    path: "/guide/architecture",
    async act(page, mobile) {
      if (mobile) await page.locator("header button[aria-label='Open Search']").first().click();
      else await page.keyboard.press("ControlOrMeta+k");
      const input = page.getByRole("dialog").locator("input").first();
      await input.waitFor();
      await input.fill("trailing stop");
      await page.getByRole("dialog").getByText(/trailing/i).nth(1).waitFor();
      await page.waitForTimeout(300);
    },
  },
  {
    name: "drawer-open",
    path: "/guide/architecture",
    only: "mobile",
    async act(page) {
      await page.getByRole("button", { name: "Open Sidebar" }).click();
      await page.getByRole("link", { name: "Contract API" }).filter({ visible: true }).first().waitFor();
      await page.waitForTimeout(300);
    },
  },
  {
    name: "toc-dropdown-open",
    path: "/guide/architecture",
    only: "mobile",
    async act(page) {
      await page.locator("[data-toc-popover-trigger]").first().click();
      await page.locator("[data-toc-popover-content]").first().waitFor();
      await page.waitForTimeout(300);
    },
  },
];

const browser = await chromium.launch();
try {
  for (const [device, width, height] of [["desktop", 1440, 900], ["mobile", 390, 844]])
    for (const scheme of ["light", "dark"])
      for (const s of shots) {
        if (s.only && s.only !== device) continue;
        const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 2, reducedMotion: "reduce" });
        const page = await ctx.newPage();
        await page.goto(base + s.path, { waitUntil: "networkidle" });
        await page.evaluate(() => document.fonts.ready);
        if (s.act) await s.act(page, device === "mobile");
        const file = `${OUT}/${s.name}-${width}-${scheme}.png`;
        await page.screenshot({ path: file, fullPage: !!s.full });
        console.log("ok", file);
        await ctx.close();
      }
} finally {
  await browser.close();
  if (server) process.kill(-server.pid);
}
