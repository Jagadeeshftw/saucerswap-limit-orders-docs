import diagrams from "@/content/diagrams.json";

type Diagram = { width: number; height: number; alt: string };

/** Never draw a diagram below this fraction of its natural size; wider ones scroll sideways instead. */
const MIN_SCALE = 0.72;

/**
 * A Mermaid diagram from the source docs, pre-rendered by scripts/sync-docs.mjs to one SVG file per theme.
 * Both are lazy images; the hidden theme's is never fetched.
 */
export function Mermaid({ hash }: { hash: string }) {
  const d = (diagrams as Record<string, Diagram>)[hash];
  if (!d) throw new Error(`diagram ${hash} was not rendered; run scripts/sync-docs.mjs`);
  const style = { width: "100%", height: "auto", maxWidth: d.width, minWidth: Math.round(d.width * MIN_SCALE) };
  const img = (theme: "light" | "dark", className: string) => (
    // eslint-disable-next-line @next/next/no-img-element -- a static SVG; next/image would add nothing
    <img src={`/diagrams/${hash}-${theme}.svg`} alt={d.alt} width={d.width} height={d.height} loading="lazy" decoding="async" className={className} style={style} />
  );
  return (
    <figure className="mermaid not-prose my-6 overflow-x-auto rounded-xl border bg-fd-card p-4" data-diagram={hash}>
      {img("light", "mx-auto dark:hidden")}
      {img("dark", "mx-auto hidden dark:block")}
    </figure>
  );
}
