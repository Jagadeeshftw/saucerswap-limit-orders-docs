// Drift check, run after `next build`. Fails the build when the site's content is not the template repo's
// docs/ (plus the README sections and contracts it maps) at the pinned ref.
//
//   node scripts/check-drift.mjs            check .cache/source, content/docs and the built pages
//   node scripts/check-drift.mjs --remote   also check that the pinned ref has not moved since this build
//
// 1. Coverage: every file in docs/, every "## " section of the README and every contract is either on the site
//    or deliberately left off (content.map.mjs). A new doc fails the build until it is placed.
// 2. Pages: each generated page equals a fresh cut of the checkout, byte for byte (no hand edits, no stale files).
// 3. Rendering: each built page shows every heading, paragraph, list item, table cell and code block of its
//    source, every Mermaid diagram, and the source commit. Anything the renderer drops fails here.
import fs from "node:fs";
import path from "node:path";
import { visit } from "unist-util-visit";
import { toString } from "mdast-util-to-string";
import { ROOT, PIN, git, checkout, treePaths, readmeParts, cutPages, pageFile, mermaidBlocks, mdParser, read, groups, unmapped, reference } from "./lib/pages.mjs";
import { referenceFragments } from "./lib/reference.mjs";
import { diagramHash } from "./lib/mermaid.mjs";

const findings = [];
const fail = (msg) => findings.push(msg);
const info = JSON.parse(fs.readFileSync(path.join(ROOT, "content/source.json"), "utf8"));
const co = checkout();
if (co.sha !== info.sha) fail(`content/source.json was built from ${info.sha}, but .cache/source holds ${co.sha}`);
if (info.ref !== PIN.ref) fail(`content/source.json is for ref ${info.ref}, but docs.source.json pins ${PIN.ref}`);

/* ---------------------------------------------------------------- 1. coverage */

const tree = treePaths();
const mappedFiles = new Set(groups.flatMap((g) => g.pages.filter((p) => p.file).map((p) => p.file)));
for (const f of [...tree].filter((p) => p.startsWith("docs/")))
  if (!mappedFiles.has(f) && !unmapped.files.includes(f)) fail(`${f} is in the repo but not on the site: map it in content.map.mjs (or list it in unmapped.files)`);
for (const f of [...mappedFiles, ...unmapped.files]) if (!tree.has(f)) fail(`${f} is mapped in content.map.mjs but is not in the repo at ${PIN.ref}`);

const { sections } = readmeParts();
const mappedSections = new Set(groups.flatMap((g) => g.pages.flatMap((p) => p.readme ?? [])).filter(Boolean));
const headings = new Set(sections.map((s) => s.heading));
for (const h of headings) if (!mappedSections.has(h) && !unmapped.readme.includes(h)) fail(`README section "## ${h}" is not on the site: map it in content.map.mjs (or list it in unmapped.readme)`);
for (const h of [...mappedSections, ...unmapped.readme]) if (!headings.has(h)) fail(`README section "## ${h}" is mapped in content.map.mjs but the README at ${PIN.ref} has no such section`);

const contracts = [...tree].filter((p) => p.startsWith("packages/foundry/contracts/") && p.endsWith(".sol"));
for (const c of contracts) if (!reference.include.includes(c) && !reference.exclude.includes(c)) fail(`${c} is neither in the Contract API nor excluded from it (content.map.mjs reference)`);
for (const c of [...reference.include, ...reference.exclude]) if (!tree.has(c)) fail(`${c} is listed in content.map.mjs reference but is not in the repo at ${PIN.ref}`);

/* ---------------------------------------------------------------- 2. pages */

const { pages } = cutPages();
const DOCS = path.join(ROOT, "content/docs");
const expected = new Set();
for (const p of pages) {
  const rel = path.join(p.dir, `${p.slug}.md`);
  expected.add(rel);
  const file = path.join(DOCS, rel);
  if (!fs.existsSync(file)) fail(`content/docs/${rel} is missing`);
  else if (fs.readFileSync(file, "utf8") !== pageFile(p)) fail(`content/docs/${rel} differs from ${p.sources[0].path} at ${PIN.ref}`);
}
for (const f of fs.readdirSync(DOCS, { recursive: true }))
  if (/\.mdx?$/.test(f) && !expected.has(f)) fail(`content/docs/${f} has no source in content.map.mjs`);

/* ---------------------------------------------------------------- 3. rendering */

const entities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) =>
    e[0] === "#" ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : (entities[e] ?? m),
  );
const visibleText = (html) =>
  decode(
    html
      .replace(/<(script|style|svg|template)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, ""),
  );
// Whitespace is the renderer's business (line wrapping, code-line spans); compare everything else.
const squash = (s) => s.replace(/\s+/g, "");

function sourceFragments(p) {
  if (p.sources[0].generated)
    return referenceFragments(reference.include.map((f) => ({ path: f, source: read(f) }))).map((f) => (f.md ? toString(mdParser.parse(f.text)) : f.text));
  const frags = [];
  for (const s of p.sources) {
    if (s.heading) frags.push(s.heading);
    visit(mdParser.parse(s.body), (node) => {
      if (node.type === "html") fail(`${p.url}: raw HTML in ${s.path} is not rendered on the site: ${node.value.slice(0, 60)}`);
      if (node.type === "code" && node.lang !== "mermaid") frags.push(node.value);
      if (["heading", "paragraph", "tableCell"].includes(node.type)) frags.push(toString(node, { includeImageAlt: false }));
    });
  }
  return frags.filter((f) => squash(f));
}

const BUILT = path.join(ROOT, ".next/server/app");
let checked = 0;
for (const p of pages) {
  const file = path.join(BUILT, `${p.url}.html`);
  if (!fs.existsSync(file)) {
    fail(`${p.url}: not in the build output (.next/server/app${p.url}.html)`);
    continue;
  }
  const html = fs.readFileSync(file, "utf8");
  const main = html.slice(html.indexOf('id="nd-page"'));
  const text = squash(visibleText(main));
  if (!html.includes(`data-source-sha="${info.sha}"`)) fail(`${p.url}: not built from ${info.sha}`);
  if (!text.includes(squash(p.title))) fail(`${p.url}: title "${p.title}" is not on the page`);
  for (const frag of sourceFragments(p)) {
    checked++;
    if (!text.includes(squash(decode(frag)))) fail(`${p.url}: the page does not show this text from ${p.sourcePath}: "${frag.replace(/\s+/g, " ").slice(0, 90)}"`);
  }
  for (const code of mermaidBlocks(p.body)) {
    checked++;
    if (!html.includes(`data-diagram="${diagramHash(code)}"`)) fail(`${p.url}: a Mermaid diagram from ${p.sourcePath} is not rendered`);
  }
}

if (process.argv.includes("--remote")) {
  const remote = process.env.DOCS_SOURCE_REMOTE ? "file://" + path.resolve(process.env.DOCS_SOURCE_REMOTE) : PIN.repo;
  const line = git(["ls-remote", remote, PIN.ref, `${PIN.ref}^{}`]).split("\n").filter(Boolean);
  const now = (line.find((l) => l.endsWith("^{}")) ?? line[0] ?? "").split(/\s/)[0];
  if (!now) fail(`${PIN.ref} does not exist on ${remote}`);
  else if (now !== info.sha) fail(`${PIN.ref} has moved: built from ${info.sha.slice(0, 7)}, now ${now.slice(0, 7)}. Rebuild to pick it up.`);
}

if (findings.length) {
  console.error(`\ndrift check FAILED: ${findings.length} finding(s)\n`);
  for (const f of findings) console.error("  " + f);
  console.error(`\nThe site must equal the template repo at ${PIN.ref}. Fix the source there, or update content.map.mjs; never edit content/ by hand.\n`);
  process.exit(1);
}
const docsCount = [...tree].filter((p) => p.startsWith("docs/")).length;
console.log(
  `drift check passed: ${pages.length} pages = ${PIN.ref} (${info.sha.slice(0, 7)}); ${checked} source blocks found in the built pages; ` +
    `all ${docsCount} docs/ files, ${headings.size} README sections and ${contracts.length} contracts accounted for`,
);
