// Assemble content/docs/ (gitignored) from the template repo at the ref pinned in docs.source.json.
//
//   node scripts/sync-docs.mjs
//   DOCS_SOURCE_REMOTE=../saucerswap-limit-orders node scripts/sync-docs.mjs   same ref, fetched from a local clone
//
// 1. Fetch exactly that ref into .cache/source/. A failed fetch fails the build: nothing stale is served.
// 2. Cut each page out of its source as content.map.mjs says (scripts/lib/pages.mjs). The text is kept byte for
//    byte; a page's own H1 (or a single README section's heading) becomes its title, and repo-relative link
//    targets point at the site page or at the file on GitHub at the pinned ref.
// 3. The Contract API page is generated from the contracts' NatSpec.
// 4. Mermaid diagrams are rendered to SVG (cached in diagrams/).
// 5. content/source.json records the resolved commit and what each page was cut from.
import fs from "node:fs";
import path from "node:path";
import { ROOT, PIN, SRC, repoWeb, fetchPinned, cutPages, pageFile, mermaidBlocks, groups } from "./lib/pages.mjs";
import { renderDiagrams, writeDiagramFiles } from "./lib/mermaid.mjs";

const OUT = path.join(ROOT, "content/docs");
const ASSETS = path.join(ROOT, "public/source");

const commit = fetchPinned();
console.log(`source: ${PIN.ref} = ${commit.sha} (${commit.date}) from ${commit.remote}`);

const { pages, assets, readmeSections } = cutPages();

fs.rmSync(OUT, { recursive: true, force: true });
for (const p of pages) {
  const file = path.join(OUT, p.dir, `${p.slug}.md`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, pageFile(p));
}

// Sidebar: one flat list per group under a label, in map order.
fs.writeFileSync(path.join(OUT, "meta.json"), JSON.stringify({ root: true, pages: groups.flatMap((g) => [`---${g.title}---`, `...${g.dir}`]) }, null, 2) + "\n");
for (const g of groups) fs.writeFileSync(path.join(OUT, g.dir, "meta.json"), JSON.stringify({ title: g.title, pages: g.pages.map((p) => p.slug) }, null, 2) + "\n");

fs.rmSync(ASSETS, { recursive: true, force: true });
fs.mkdirSync(ASSETS, { recursive: true });
for (const a of assets) fs.copyFileSync(path.join(SRC, a), path.join(ASSETS, path.posix.basename(a)));

const rendered = await renderDiagrams(pages.flatMap((p) => mermaidBlocks(p.body)));
fs.writeFileSync(path.join(ROOT, "content/diagrams.json"), JSON.stringify(writeDiagramFiles(rendered, path.join(ROOT, "public/diagrams")), null, 1) + "\n");

// The testnet vault on HashScan, as the README's "See it work on testnet" names it.
const vault = readmeSections.find((s) => s.heading === "See it work on testnet")?.body.match(/\]\((https:\/\/hashscan\.io\/testnet\/contract\/[^)]+)\)/)?.[1];

fs.writeFileSync(
  path.join(ROOT, "content/source.json"),
  JSON.stringify(
    {
      repo: repoWeb,
      ref: PIN.ref,
      sha: commit.sha,
      date: commit.date,
      vaultUrl: vault ?? null,
      pages: pages.map((p) => ({ url: p.url, title: p.title, sources: p.sources.map(({ body, ...s }) => s) })),
    },
    null,
    2,
  ) + "\n",
);
console.log(`wrote ${pages.length} pages, ${Object.keys(rendered).length} diagrams, ${assets.size} assets`);
