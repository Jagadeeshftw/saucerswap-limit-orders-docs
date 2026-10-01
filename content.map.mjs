// Which file (or README section) of the template repo becomes which page, and where it sits in the sidebar.
//
// Every page's prose comes from the template repo at the ref pinned in docs.source.json; nothing here is
// copied from it. A page is one of:
//   { file }                 a whole docs/ file; its H1 is the page title
//   { readme: [sections] }   README.md sections by their exact "## " heading, in order. One section: its heading
//                            is the page title. Several: `title` names the page and each keeps its heading.
//                            `null` is the README's opening (everything between the H1 and the first "## ").
// `nav` is the sidebar label when it differs from the title.
//
// The drift check fails the build when docs/ or the README gains a file or section that is neither mapped here
// nor listed in `unmapped`, or when a mapped one disappears.

export const groups = [
  {
    dir: "getting-started",
    title: "Getting started",
    pages: [
      { slug: "introduction", title: "Introduction", readme: [null, "See it work on testnet"] },
      { slug: "quick-start", title: "Quick start", readme: ["Create a project", "Run it"] },
      { slug: "testnet-account", nav: "Testnet account", readme: ["Get a Hedera testnet account"] },
      { slug: "deploy", nav: "Deploy your own vault", readme: ["Deploy your own vault"] },
      { slug: "configuration", readme: ["Configuration"] },
    ],
  },
  {
    dir: "guide",
    title: "Guide",
    pages: [
      { slug: "architecture", nav: "How an order works", file: "docs/ARCHITECTURE.md" },
      { slug: "guard", nav: "The guard & oracle", readme: ["The guard, and why HBAR/USDC never fills on testnet"] },
      { slug: "costs", nav: "Cost model", readme: ["What an order costs"] },
      { slug: "when-checks-stop", readme: ["When checks stop"] },
      { slug: "tests", readme: ["Tests"] },
      { slug: "troubleshooting", readme: ["Troubleshooting"] },
    ],
  },
  {
    dir: "extend",
    title: "Extend",
    pages: [
      { slug: "order-types", nav: "Pluggable order types", file: "docs/PLUGINS-DESIGN.md" },
      { slug: "write-an-order-type", nav: "Write an order type", file: "docs/ORDER-TYPES.md" },
      { slug: "extending-the-vault", readme: ["Extending the vault"] },
      { slug: "mainnet", nav: "Go to mainnet", file: "docs/MAINNET-CHECKLIST.md" },
      { slug: "gate-check", nav: "Template gate check", readme: ["Template gate check"] },
    ],
  },
  {
    dir: "reference",
    title: "Reference",
    pages: [
      // Generated in the template repo (scripts/gen-contract-api.mjs, checked fresh in its CI) from the NatSpec.
      { slug: "contract-api", nav: "Contract API", file: "docs/CONTRACT-API.md" },
      { slug: "glossary", file: "docs/GLOSSARY.md" },
      { slug: "faq", file: "docs/FAQ.md" },
      { slug: "layout", nav: "Repository layout", readme: ["Layout"] },
    ],
  },
];

/** Deliberately not pages. */
export const unmapped = {
  // The README's pointer list to docs/ (the sidebar is that list here) and the licence (linked in the footer).
  readme: ["More documentation", "Licence"],
  // Assets, served next to the pages that use them.
  files: ["docs/demo.gif"],
};
