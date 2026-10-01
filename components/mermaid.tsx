import diagrams from "@/content/diagrams.json";

type Rendered = { light: string; dark: string; source: string };

/** Never draw a diagram below this fraction of its natural size; wider ones scroll sideways instead. */
const MIN_SCALE = 0.72;

/** Size the SVG from its viewBox: fill the column, but scroll rather than shrink text past MIN_SCALE. */
function sized(svg: string) {
  const vb = svg.match(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) ([\d.]+)"/);
  const w = vb ? Number(vb[1]) : 800;
  const h = vb ? Number(vb[2]) : 400;
  const style = `width:100%;height:auto;max-width:${w}px;min-width:${Math.round(w * MIN_SCALE)}px;aspect-ratio:${w}/${h}`;
  return (
    svg
      .replace(/^<svg([^>]*?) width="100%"/, "<svg$1")
      .replace(/^<svg([^>]*?) style="max-width: [\d.]+px;"/, `<svg$1 style="${style}"`)
      // The SVG measured its text in Montserrat; draw it in the page's copy of the same font.
      .replaceAll("Montserrat, ui-sans-serif", "var(--font-montserrat), Montserrat, ui-sans-serif")
  );
}

/** A Mermaid diagram from the source docs, pre-rendered to SVG for each theme by scripts/sync-docs.mjs. */
export function Mermaid({ hash }: { hash: string }) {
  const d = (diagrams as Record<string, Rendered>)[hash];
  if (!d) throw new Error(`diagram ${hash} was not rendered; run scripts/sync-docs.mjs`);
  return (
    <figure className="mermaid not-prose my-6 overflow-x-auto rounded-xl border bg-fd-card p-4" data-diagram={hash} tabIndex={0} aria-label="Diagram (scrolls sideways)">
      <div className="dark:hidden" dangerouslySetInnerHTML={{ __html: sized(d.light) }} />
      <div className="hidden dark:block" dangerouslySetInnerHTML={{ __html: sized(d.dark) }} />
    </figure>
  );
}
