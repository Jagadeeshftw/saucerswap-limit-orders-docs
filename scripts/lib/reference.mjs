// Render scanned Solidity units (scripts/lib/natspec.mjs) as the Contract API page.
import { scanSolidity } from "./natspec.mjs";

const cell = (s) => s.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
const sentence = (s) => s.trim();

function docParas(doc) {
  const out = [];
  if (doc.notice) out.push(sentence(doc.notice));
  if (doc.dev) out.push(sentence(doc.dev));
  return out;
}

function namedTable(head, rows) {
  if (!rows.length) return "";
  return [`| ${head} | Description |`, "| --- | --- |", ...rows.map(([n, d]) => `| \`${n || "(unnamed)"}\` | ${cell(d)} |`)].join("\n");
}

function functionBlock(fn, inherited) {
  const doc = fn.doc.inheritdoc && inherited[fn.doc.inheritdoc]?.[fn.name] ? inherited[fn.doc.inheritdoc][fn.name] : fn.doc;
  const parts = [`#### ${fn.name}`, "```solidity\n" + fn.signature + "\n```", ...docParas(doc)];
  const p = namedTable("Parameter", doc.params);
  if (p) parts.push(p);
  const r = namedTable("Returns", doc.returns);
  if (r) parts.push(r);
  return parts.join("\n\n");
}

function signatureTable(head, items) {
  const rows = items.map((x) => `| \`${cell(x.signature.replace(/^(event|error)\s+/, ""))}\` | ${cell([x.doc.notice, x.doc.dev].filter(Boolean).join(" "))} |`);
  return [`| ${head} | Description |`, "| --- | --- |", ...rows].join("\n");
}

function typeBlock(t) {
  return [`#### ${t.name}`, ...docParas(t.doc), "```solidity\n" + t.body + "\n```"].join("\n\n");
}

/**
 * files: [{ path, source }] in page order. blob(path) links a source file on GitHub.
 * Returns the page body (markdown, no frontmatter).
 */
export function renderReference(files, blob) {
  const scanned = files.map((f) => ({ ...f, units: scanSolidity(f.source).units }));
  // @inheritdoc targets: contract name -> function name -> doc
  const inherited = {};
  for (const f of scanned)
    for (const u of f.units) {
      inherited[u.name] = {};
      for (const fn of u.functions) inherited[u.name][fn.name] = fn.doc;
    }

  const out = [];
  for (const f of scanned) {
    for (const u of f.units) {
      if (u.kind === "file") {
        out.push(`## Shared types`);
        out.push(`File-level declarations in [\`${f.path}\`](${blob(f.path)}).`);
        if (u.enums.length) out.push("### Enums", ...u.enums.map(typeBlock));
        if (u.structs.length) out.push("### Structs", ...u.structs.map(typeBlock));
        if (u.errors.length) out.push("### Errors", signatureTable("Error", u.errors));
        continue;
      }
      out.push(`## ${u.name}`);
      out.push(...docParas(u.doc));
      out.push(`\`${u.heading}\` · [\`${f.path}\`](${blob(f.path)})`);

      const owner = u.functions.filter((fn) => /\bonlyOwner\b/.test(fn.signature));
      const views = u.functions.filter((fn) => !owner.includes(fn) && /\b(view|pure)\b/.test(fn.signature));
      const actions = u.functions.filter((fn) => !owner.includes(fn) && !views.includes(fn));
      const grouped = owner.length || (views.length && actions.length);
      if (!grouped) {
        if (u.functions.length) out.push("### Functions", ...u.functions.map((fn) => functionBlock(fn, inherited)));
      } else {
        if (actions.length) out.push("### Functions", ...actions.map((fn) => functionBlock(fn, inherited)));
        if (views.length) out.push("### View functions", ...views.map((fn) => functionBlock(fn, inherited)));
        if (owner.length) out.push("### Owner functions", ...owner.map((fn) => functionBlock(fn, inherited)));
      }
      if (u.state.length)
        out.push(
          "### Public state",
          ["| Declaration | Description |", "| --- | --- |", ...u.state.map((s) => `| \`${cell(s.signature)}\` | ${cell([s.doc.notice, s.doc.dev].filter(Boolean).join(" "))} |`)].join("\n"),
        );
      if (u.events.length) out.push("### Events", signatureTable("Event", u.events));
      if (u.errors.length) out.push("### Errors", signatureTable("Error", u.errors));
      // Structs declared inside a contract are listed only when its external surface uses them.
      const surface = [...u.functions, ...u.events, ...u.errors].map((x) => x.signature).join(" ");
      const structs = u.structs.filter((s) => new RegExp(`\\b${s.name}\\b`).test(surface));
      if (structs.length) out.push("### Structs", ...structs.map(typeBlock));
    }
  }
  return out.join("\n\n") + "\n";
}

/**
 * Every fragment the reference must show for these files, for the drift check: signatures (shown as code, so
 * `md: false`) and NatSpec text (rendered as Markdown, so `md: true`).
 */
export function referenceFragments(files) {
  const frags = [];
  for (const f of files)
    for (const u of scanSolidity(f.source).units) {
      for (const x of [...u.functions, ...u.events, ...u.errors, ...u.state]) {
        frags.push({ text: x.signature.replace(/^(event|error)\s+/, ""), md: false });
        if (x.doc.notice) frags.push({ text: x.doc.notice, md: true });
        if (x.doc.dev) frags.push({ text: x.doc.dev, md: true });
      }
      for (const t of [...u.structs, ...u.enums]) if (u.kind === "file") frags.push({ text: t.body, md: false });
      if (u.doc.notice) frags.push({ text: u.doc.notice, md: true });
    }
  return frags;
}
