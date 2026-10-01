// Link check, run after `next build`. Every link and image on every built page must resolve:
//   - site links: the page (or redirect, or static file) exists, and its #anchor is an id on that page
//   - links into the template repo on GitHub at the pinned ref: the path exists in that tree, and a #anchor on
//     a Markdown file is one of its headings
// Other external links are listed by host but not fetched, so the build does not depend on third-party uptime.
import fs from "node:fs";
import path from "node:path";
import GithubSlugger from "github-slugger";
import { ROOT, PIN, repoWeb, treePaths, read } from "./lib/pages.mjs";

const BUILT = path.join(ROOT, ".next/server/app");
const PUBLIC = path.join(ROOT, "public");
const findings = [];

// Built pages: route -> set of ids
const pages = new Map();
for (const f of fs.readdirSync(BUILT, { recursive: true })) {
  if (!f.endsWith(".html") || f.startsWith("_")) continue;
  const route = "/" + f.replace(/\.html$/, "").replace(/(^|\/)index$/, "");
  const html = fs.readFileSync(path.join(BUILT, f), "utf8");
  pages.set(route === "/" ? "/" : route.replace(/\/$/, ""), { html, ids: new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])) });
}

// Other routes the site serves: redirects, generated files and per-page OG images.
const nextConfig = (await import(path.join(ROOT, "next.config.mjs"))).default;
const redirects = new Map((await nextConfig.redirects?.())?.map((r) => [r.source, r.destination]) ?? []);
const extraRoutes = new Set(["/sitemap.xml", "/robots.txt", "/llms.txt", "/api/search", "/og/home/image.png"]);
for (const r of pages.keys()) if (r !== "/" && !r.startsWith("/_")) extraRoutes.add(`/og${r}/image.png`);

const tree = treePaths();
const headingSlugs = new Map(); // repo markdown path -> its heading slugs, as GitHub renders them
function repoAnchors(p) {
  if (!headingSlugs.has(p)) {
    const slugger = new GithubSlugger();
    let fence = null;
    const set = new Set();
    for (const line of read(p).split("\n")) {
      const f = line.match(/^\s*(```+|~~~+)/);
      if (f) fence = fence ? (line.trim().startsWith(fence) ? null : fence) : f[1];
      const h = !fence && line.match(/^#{1,6}\s+(.*?)\s*#*$/);
      if (h) set.add(slugger.slug(h[1].replace(/`/g, "")));
    }
    headingSlugs.set(p, set);
  }
  return headingSlugs.get(p);
}

const external = new Map();
let checked = 0;
for (const [route, { html }] of pages) {
  const refs = [...html.matchAll(/<(a|img|link)\b[^>]*?\s(href|src)="([^"]+)"/g)].filter((m) => !(m[1] === "link" && !/rel="(canonical|alternate)"/.test(m[0])));
  for (const [, , , rawHref] of refs) {
    const href = rawHref.replace(/&amp;/g, "&");
    if (/^(mailto:|tel:|data:|javascript:)/.test(href) || href.startsWith("/_next/")) continue;
    checked++;
    const where = `${route}: ${href}`;
    if (/^https?:/.test(href)) {
      const url = new URL(href);
      const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://limit-orders.0xo.in";
      if (href.startsWith(site)) {
        checkSite(url.pathname + url.hash, route, where);
        continue;
      }
      const prefix = new RegExp(`^${repoWeb.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/(blob|tree)/${PIN.ref.replace(/\./g, "\\.")}/([^#?]*)`);
      const m = href.match(prefix);
      if (m) {
        const p = decodeURIComponent(m[2]).replace(/\/$/, "");
        const isDir = [...tree].some((t) => t.startsWith(p + "/"));
        if (!tree.has(p) && !isDir) findings.push(`${where}: ${p} is not in the template repo at ${PIN.ref}`);
        else if (url.hash && p.endsWith(".md") && !repoAnchors(p).has(decodeURIComponent(url.hash.slice(1)))) findings.push(`${where}: ${p} has no heading for ${url.hash}`);
        continue;
      }
      if (href.startsWith(repoWeb) && !/\/(blob|tree)\//.test(href)) continue; // the repo itself
      external.set(url.host, (external.get(url.host) ?? 0) + 1);
      continue;
    }
    checkSite(href, route, where);
  }
}

function checkSite(href, route, where) {
  const url = new URL(href, `https://site${route}`);
  const target = decodeURIComponent(url.pathname).replace(/\/$/, "") || "/";
  const hash = decodeURIComponent(url.hash.slice(1));
  if (pages.has(target)) {
    if (hash && !pages.get(target).ids.has(hash)) findings.push(`${where}: ${target} has no element with id "${hash}"`);
    return;
  }
  if (redirects.has(target)) {
    const dest = redirects.get(target);
    if (!pages.has(dest)) findings.push(`${where}: redirects to ${dest}, which is not a page`);
    return;
  }
  if (extraRoutes.has(target) || fs.existsSync(path.join(PUBLIC, target))) return;
  findings.push(`${where}: no such page or file`);
}

if (findings.length) {
  console.error(`\nlink check FAILED: ${findings.length} broken link(s)\n`);
  for (const f of findings) console.error("  " + f);
  console.error("");
  process.exit(1);
}
const ext = [...external].map(([h, n]) => `${h} ${n}`).join(", ");
console.log(`link check passed: ${checked} links and images on ${pages.size} pages resolve (external, not fetched: ${ext || "none"})`);
