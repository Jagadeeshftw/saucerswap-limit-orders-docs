// A small Solidity declaration scanner: enough to turn the template's NatSpec into a reference page.
// It reads contracts, interfaces and libraries, their external/public functions, public state, events, errors,
// and file-level structs, enums and errors, each with the NatSpec comment directly above it. It does not
// compile anything; the source text is the single source.

/** Remove string literals and non-doc `//` comments so braces and semicolons in them are not counted. */
function codeOnly(line) {
  return line
    .replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""')
    .replace(/\/\/.*$/, "");
}

function count(s, ch) {
  let n = 0;
  for (const c of s) if (c === ch) n++;
  return n;
}

/** Parse collected NatSpec lines into { title, notice, dev, params: [[name, text]], returns: [[name, text]], inheritdoc }. */
export function parseNatspec(lines) {
  const doc = { notice: "", dev: "", title: "", params: [], returns: [], inheritdoc: "" };
  let cur = null; // [kind, entry]
  const append = (text) => {
    if (!cur) {
      doc.notice += (doc.notice ? " " : "") + text;
      return;
    }
    const [kind, entry] = cur;
    if (kind === "param" || kind === "return") entry[1] += (entry[1] ? " " : "") + text;
    else doc[kind] += (doc[kind] ? " " : "") + text;
  };
  for (const raw of lines) {
    const text = raw.trim();
    if (!text) continue;
    const m = text.match(/^@(\w+)\s*(.*)$/);
    if (!m) {
      append(text);
      continue;
    }
    const [, tag, rest] = m;
    if (tag === "param" || tag === "return") {
      const pm = tag === "param" ? rest.match(/^(\w+)\s*(.*)$/) : rest.match(/^(\w+)\s+(.*)$/);
      const entry = pm ? [pm[1], pm[2]] : ["", rest];
      (tag === "param" ? doc.params : doc.returns).push(entry);
      cur = [tag, entry];
    } else if (tag === "notice" || tag === "dev" || tag === "title") {
      cur = [tag];
      doc[tag] += (doc[tag] ? " " : "") + rest;
    } else if (tag === "inheritdoc") {
      doc.inheritdoc = rest.trim();
      cur = null;
    } else {
      cur = ["dev"];
      doc.dev += (doc.dev ? " " : "") + rest;
    }
  }
  return doc;
}

/**
 * Scan one Solidity file. Returns { units: [{ kind, name, doc, functions, state, events, errors, structs, enums }] }
 * where file-level types live in a unit of kind "file".
 */
export function scanSolidity(source) {
  const lines = source.split("\n");
  const fileUnit = { kind: "file", name: "", doc: parseNatspec([]), functions: [], state: [], events: [], errors: [], structs: [], enums: [] };
  const units = [fileUnit];
  let unit = fileUnit;
  let depth = 0;
  let docLines = [];
  let inBlockDoc = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const t = line.trim();

    // NatSpec: /// lines and /** */ blocks
    if (inBlockDoc) {
      const body = t.replace(/\*\/\s*$/, "").replace(/^\*\s?/, "");
      if (body) docLines.push(body);
      if (t.endsWith("*/")) inBlockDoc = false;
      continue;
    }
    if (t.startsWith("/**")) {
      const body = t.replace(/^\/\*\*\s?/, "").replace(/\*\/\s*$/, "");
      if (body) docLines.push(body);
      inBlockDoc = !t.endsWith("*/");
      continue;
    }
    if (t.startsWith("///")) {
      docLines.push(t.replace(/^\/\/\/\s?/, ""));
      continue;
    }
    if (t === "" || t.startsWith("//")) {
      if (t === "") docLines = [];
      continue;
    }

    const doc = parseNatspec(docLines);
    docLines = [];

    // Gather a whole declaration: up to the first `{` or `;` outside parentheses.
    const gather = () => {
      let text = "";
      let parens = 0;
      let j = i;
      for (; j < lines.length; j++) {
        const c = codeOnly(lines[j]);
        for (let k = 0; k < c.length; k++) {
          const ch = c[k];
          if (ch === "(") parens++;
          else if (ch === ")") parens--;
          else if (parens === 0 && (ch === "{" || ch === ";")) {
            text += " " + c.slice(0, k);
            return { text: text.replace(/\s+/g, " ").trim(), end: j, terminator: ch, rest: c.slice(k) };
          }
        }
        text += " " + c;
      }
      return { text: text.replace(/\s+/g, " ").trim(), end: j, terminator: "", rest: "" };
    };

    // Capture a braced body verbatim (struct / enum), returning its source lines.
    const gatherBody = () => {
      const out = [];
      let d = 0;
      let j = i;
      for (; j < lines.length; j++) {
        out.push(lines[j]);
        const c = codeOnly(lines[j]);
        d += count(c, "{") - count(c, "}");
        if (d <= 0 && c.includes("}")) break;
      }
      return { body: out, end: j };
    };

    const unitDecl = t.match(/^(abstract\s+contract|contract|interface|library)\s+(\w+)/);
    const memberDepth = unit === fileUnit ? 0 : 1;

    if (unitDecl && depth === 0) {
      const kind = unitDecl[1].replace(/\s+/g, " ");
      const g = gather();
      unit = { kind, name: unitDecl[2], heading: g.text, doc, functions: [], state: [], events: [], errors: [], structs: [], enums: [] };
      units.push(unit);
      depth += count(g.rest, "{") - count(g.rest, "}");
      i = g.end;
      continue;
    }

    if (depth === memberDepth) {
      let m;
      if ((m = t.match(/^function\s+(\w+)/))) {
        const g = gather();
        const vis = /\b(external|public)\b/.test(g.text) || unit.kind === "interface";
        if (vis) unit.functions.push({ name: m[1], signature: g.text, doc });
        depth += count(g.rest, "{") - count(g.rest, "}");
        i = g.end;
        if (g.terminator === "{") i = skipBody(lines, i, g.rest, (d) => (depth = memberDepth + d)) ?? i;
        depth = memberDepth;
        continue;
      }
      if ((m = t.match(/^(event|error)\s+(\w+)/))) {
        const g = gather();
        (m[1] === "event" ? unit.events : unit.errors).push({ name: m[2], signature: g.text, doc });
        i = g.end;
        continue;
      }
      if ((m = t.match(/^(struct|enum)\s+(\w+)/))) {
        const b = gatherBody();
        (m[1] === "struct" ? unit.structs : unit.enums).push({ name: m[2], body: dedent(b.body), doc });
        i = b.end;
        continue;
      }
      if ((m = t.match(/^modifier\s+(\w+)/)) || (m = t.match(/^(constructor|receive|fallback)\b/))) {
        const g = gather();
        i = g.end;
        if (g.terminator === "{") i = skipBody(lines, i, g.rest) ?? i;
        continue;
      }
      if (unit !== fileUnit && /\bpublic\b/.test(codeOnly(t)) && !/^(using|function)\b/.test(t)) {
        const g = gather();
        const nm = g.text.match(/(\w+)\s*(?:=(?!>).*)?$/);
        if (nm) unit.state.push({ name: nm[1], signature: g.text, doc });
        i = g.end;
        continue;
      }
    }

    const c = codeOnly(line);
    depth += count(c, "{") - count(c, "}");
    if (depth === 0 && unit !== fileUnit) unit = fileUnit;
  }
  return { units: units.filter((u) => u.kind !== "file" || u.structs.length || u.enums.length || u.errors.length || u.events.length) };
}

/** Skip a function/modifier body that opened on line `i` (`rest` is that line from the `{`). Returns the closing line. */
function skipBody(lines, i, rest) {
  let d = count(rest, "{") - count(rest, "}");
  if (d <= 0) return i;
  for (let j = i + 1; j < lines.length; j++) {
    const c = codeOnly(lines[j]);
    d += count(c, "{") - count(c, "}");
    if (d <= 0) return j;
  }
  return lines.length - 1;
}

function dedent(lines) {
  const indent = Math.min(...lines.filter((l) => l.trim()).map((l) => l.match(/^\s*/)[0].length));
  return lines.map((l) => l.slice(indent)).join("\n");
}
