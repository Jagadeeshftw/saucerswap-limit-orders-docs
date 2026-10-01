// Fetching the pinned ref and cutting it into pages. Shared by the sync (which writes the pages) and the drift
// check (which re-derives them from the same checkout and compares).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import GithubSlugger from "github-slugger";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { toString } from "mdast-util-to-string";
import { groups, unmapped } from "../../content.map.mjs";

export const ROOT = path.resolve(import.meta.dirname, "../..");
export const PIN = JSON.parse(fs.readFileSync(path.join(ROOT, "docs.source.json"), "utf8"));
export const SRC = path.join(ROOT, ".cache/source");
export const repoWeb = PIN.repo.replace(/\.git$/, "");
export const blob = (p, hash = "") => `${repoWeb}/blob/${PIN.ref}/${p}${hash}`;

export function git(args, cwd = SRC) {
  return execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
}

/**
 * Fetch exactly the pinned ref into .cache/source: shallow, blobless, with only docs/ and README.md checked out
 * (the full tree listing is still there, for link checks). DOCS_SOURCE_REMOTE overrides
 * where it is fetched from, e.g. a local clone for a ref not pushed yet; the ref is the same either way.
 */
export function fetchPinned() {
  let remote = process.env.DOCS_SOURCE_REMOTE || PIN.repo;
  if (fs.existsSync(remote)) remote = "file://" + path.resolve(remote); // a shallow fetch from a local clone needs file://
  fs.rmSync(SRC, { recursive: true, force: true });
  fs.mkdirSync(SRC, { recursive: true });
  git(["init", "-q"]);
  git(["sparse-checkout", "set", "--no-cone", "/docs/", "/README.md"]);
  try {
    git(["fetch", "-q", "--depth", "1", "--filter=blob:none", remote, PIN.ref]);
  } catch (e) {
    throw new Error(`cannot fetch ${PIN.ref} from ${remote}: ${e.stderr?.toString().trim() || e.message}`);
  }
  git(["checkout", "-q", "FETCH_HEAD"]);
  return checkout();
}

/** What .cache/source holds. */
export function checkout() {
  return {
    sha: git(["rev-parse", "HEAD"]),
    date: git(["log", "-1", "--format=%cI"]),
    remote: process.env.DOCS_SOURCE_REMOTE ? `${PIN.repo} (fetched from ${process.env.DOCS_SOURCE_REMOTE})` : PIN.repo,
  };
}

export const read = (p) => fs.readFileSync(path.join(SRC, p), "utf8");
/** Every path in the pinned tree (blobless fetches still carry trees). */
export const treePaths = () => new Set(git(["ls-tree", "-r", "--name-only", "HEAD"]).split("\n"));

/** Split markdown at headings of exactly this depth, ignoring fenced code. The first part has heading null. */
export function splitHeadings(md, depth) {
  const marker = "#".repeat(depth) + " ";
  const parts = [{ heading: null, lines: [] }];
  let fence = null;
  for (const line of md.split("\n")) {
    const f = line.match(/^\s*(```+|~~~+)/);
    if (f) fence = fence ? (line.trim().startsWith(fence) ? null : fence) : f[1];
    if (!fence && line.startsWith(marker)) parts.push({ heading: line.slice(marker.length).trim(), lines: [] });
    else parts[parts.length - 1].lines.push(line);
  }
  return parts.map((p) => ({ heading: p.heading, body: p.lines.join("\n").replace(/^\n+/, "").replace(/\s+$/, "") + "\n" }));
}

export function readmeParts() {
  const [top, ...sections] = splitHeadings(read("README.md"), 2);
  const h1 = splitHeadings(top.body, 1);
  return { preamble: h1.length > 1 ? h1[1].body : top.body, sections };
}

/**
 * Cut every page out of the checkout, as content.map.mjs says. Each page: { url, dir, slug, nav, title, body,
 * sources: [{ path, heading?, body }], sourcePath, sourceUrl, description }. `body` is final:
 * source text byte for byte, with only repo-relative link targets pointed at the site.
 */
export function cutPages() {
  const { preamble, sections } = readmeParts();
  const sectionByHeading = new Map(sections.map((s) => [s.heading, s]));
  const pages = [];
  for (const g of groups)
    for (const p of g.pages) {
      const url = `/${g.dir}/${p.slug}`;
      let title = p.title;
      let body;
      const sources = [];
      if (p.file) {
        const [lead, ...rest] = splitHeadings(read(p.file), 1);
        if (rest.length !== 1 || lead.body.trim()) throw new Error(`${p.file}: expected exactly one H1, at the top`);
        title ??= rest[0].heading;
        body = rest[0].body;
        sources.push({ path: p.file, body });
      } else if (p.readme) {
        const parts = p.readme.map((h) => {
          if (h === null) return { heading: null, body: preamble };
          const s = sectionByHeading.get(h);
          if (!s) throw new Error(`README.md has no "## ${h}" section (content.map.mjs, ${url})`);
          return s;
        });
        if (parts.length === 1 && parts[0].heading) {
          title ??= parts[0].heading;
          body = parts[0].body;
        } else {
          if (!title) throw new Error(`${url}: a page cut from several README sections needs a title`);
          body = parts.map((s) => (s.heading ? `## ${s.heading}\n\n${s.body}` : s.body)).join("\n");
        }
        for (const s of parts) sources.push({ path: "README.md", heading: s.heading, body: s.body });
      } else throw new Error(`${url}: page has no source`);
      pages.push({ url, dir: g.dir, slug: p.slug, nav: p.nav, title, body, sources });
    }

  const links = linkResolver(pages);
  for (const p of pages) {
    const from = p.sources[0];
    p.body = links.rewrite(p.body, from.path);
    p.sourcePath = from.path;
    p.sourceUrl =
      from.path === "README.md" && from.heading ? blob("README.md", `#${new GithubSlugger().slug(from.heading)}`) : blob(from.path);
    p.description = describe(p.sources.map((s) => s.body).join("\n"));
  }
  return { pages, assets: links.assets, readmeSections: sections };
}

/** Repo-relative links: to the site page that shows the target, else to the file on GitHub at the pinned ref. */
function linkResolver(pages) {
  const fileUrl = new Map();
  const readmeAnchorUrl = new Map();
  for (const p of pages)
    for (const s of p.sources) {
      if (s.path !== "README.md") fileUrl.set(s.path, p.url);
      else if (s.heading === null) fileUrl.set("README.md", p.url);
      else {
        const slug = new GithubSlugger().slug(s.heading);
        // a page cut from one section turns that heading into its title, so the anchor is the page itself
        readmeAnchorUrl.set(slug, p.sources.length > 1 ? `${p.url}#${slug}` : p.url);
      }
    }

  const assets = new Set();
  const resolve = (href, fromFile) => {
    if (href.startsWith("#") && fromFile === "README.md" && readmeAnchorUrl.has(href.slice(1))) return readmeAnchorUrl.get(href.slice(1));
    if (/^([a-z]+:|#|\/)/i.test(href)) return href;
    const [file, hash] = href.split("#");
    const repoPath = path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), file));
    if (repoPath === "README.md" && hash && readmeAnchorUrl.has(hash)) return readmeAnchorUrl.get(hash);
    if (fileUrl.has(repoPath)) return fileUrl.get(repoPath) + (hash ? `#${hash}` : "");
    if (unmapped.files.includes(repoPath)) {
      assets.add(repoPath);
      return `/source/${path.posix.basename(repoPath)}`;
    }
    return blob(repoPath, hash ? `#${hash}` : "");
  };

  const rewrite = (md, fromFile) => {
    const out = [];
    let fence = null;
    for (const line of md.split("\n")) {
      const f = line.match(/^\s*(```+|~~~+)/);
      if (f) fence = fence ? (line.trim().startsWith(fence) ? null : fence) : f[1];
      if (f || fence) {
        out.push(line);
        continue;
      }
      out.push(
        line
          .split(/(`[^`]*`)/)
          .map((seg, i) => (i % 2 ? seg : seg.replace(/\]\(([^)\s]+)\)/g, (_, href) => `](${resolve(href, fromFile)})`)))
          .join(""),
      );
    }
    return out.join("\n");
  };
  return { rewrite, assets };
}

export const mdParser = unified().use(remarkParse).use(remarkGfm);

/** A page's description: its first real paragraph as plain text, cut at a sentence within 160 characters. */
function describe(body) {
  const tree = mdParser.parse(body);
  const paras = tree.children.filter((n) => n.type === "paragraph").map((n) => toString(n, { includeImageAlt: false }).replace(/\s+/g, " ").trim());
  const text = paras.find((t) => t.length > 40) ?? paras[0] ?? "";
  if (text.length <= 160) return text;
  const cut = text.slice(0, 160);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  if (end > 60) return cut.slice(0, end + 1);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:]$/, "") + "…";
}

/** The frontmatter + body written for a page. */
export function pageFile(p) {
  const fm = {
    // `title` names the page in the sidebar and search; `heading` is the source's own title, for the H1 and <title>.
    title: p.nav ?? p.title,
    heading: p.title,
    description: p.description,
    sourcePath: p.sourcePath,
    sourceUrl: p.sourceUrl,
  };
  return (
    "---\n" +
    Object.entries(fm)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join("\n") +
    "\n---\n\n" +
    p.body
  );
}

export const mermaidBlocks = (body) => [...body.matchAll(/^```mermaid\n([\s\S]*?)\n```$/gm)].map((m) => m[1]);
export { groups, unmapped };
