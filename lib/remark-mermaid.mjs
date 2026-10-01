import { visit } from "unist-util-visit";
import { diagramHash } from "../scripts/lib/mermaid.mjs";

/** ```mermaid blocks become <Mermaid hash="…" />, which renders the SVG pre-rendered by scripts/sync-docs.mjs. */
export function remarkMermaid() {
  return (tree) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== "mermaid" || !parent || index === undefined) return;
      parent.children[index] = {
        type: "mdxJsxFlowElement",
        name: "Mermaid",
        attributes: [{ type: "mdxJsxAttribute", name: "hash", value: diagramHash(node.value) }],
        children: [],
      };
    });
  };
}
