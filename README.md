# saucerswap-limit-orders-docs

The documentation site for [saucerswap-limit-orders](https://github.com/Jagadeeshftw/saucerswap-limit-orders), a
Scaffold-HBAR template: keeperless limit, stop and trailing-stop orders on SaucerSwap V2. Live at
<https://limit-orders.0xo.in>.

No prose lives in this repo. Every page is cut, at build time, from the template repo's `docs/` folder, its
README sections and its contracts' NatSpec, at the ref pinned in [`docs.source.json`](docs.source.json). To change
what a page says, change the template repo.

## How a build works

```bash
npm install
npm run build      # sync from the pinned ref -> next build -> drift check -> link check
npm start
```

1. **Sync** ([`scripts/sync-docs.mjs`](scripts/sync-docs.mjs)) fetches exactly the pinned ref (shallow, sparse:
   `docs/`, `README.md`, `packages/foundry/contracts/`) into `.cache/source/`, then writes the pages to
   `content/docs/` (gitignored) as [`content.map.mjs`](content.map.mjs) lays them out in the four sidebar groups.
   Page text is kept byte for byte; a page's own H1 (or a single README section's heading) becomes its title, and
   repo-relative links point at the site page or at the file on GitHub at the pinned ref. The Contract API page is
   generated from the NatSpec in the contracts. A failed fetch fails the build.
2. **Diagrams.** Mermaid blocks are rendered to SVG at build time, light and dark, so pages ship no diagram
   runtime. Renders are cached in [`diagrams/`](diagrams) (committed), keyed by the diagram source, the Mermaid
   version and the theme. A build whose diagrams are all cached needs no browser; when the source adds or
   changes a diagram, run the build once locally (Playwright's Chromium renders it) and commit `diagrams/`.
3. **Drift check** ([`scripts/check-drift.mjs`](scripts/check-drift.mjs)) fails the build unless:
   - every file in `docs/`, every `## ` section of the README and every contract is on the site or deliberately
     left off in `content.map.mjs` (a new doc fails the build until it is placed);
   - every generated page equals a fresh cut of the pinned checkout, byte for byte;
   - every built page shows every heading, paragraph, table cell and code block of its source, every diagram,
     and the source commit.

   `node scripts/check-drift.mjs --remote` also fails when the pinned ref has moved since the build.
4. **Link check** ([`scripts/check-links.mjs`](scripts/check-links.mjs)) fails the build when any link or image
   on any built page does not resolve: site pages and their `#anchors`, and links into the template repo (the path
   must exist at the pinned ref, and a `#anchor` on a Markdown file must be one of its headings).

## Changing the pinned ref

Edit `ref` in `docs.source.json` (a branch or a tag) and build. To build a ref that is not on GitHub yet, fetch it
from a local clone instead; the ref is the same, only the remote changes:

```bash
DOCS_SOURCE_REMOTE=../saucerswap-limit-orders npm run build
```

## Other scripts

```bash
npm run dev          # sync, then next dev
npm run screenshots  # 1440 and 390, light and dark, into screenshots/ (or pass a deployed URL)
npm run lint
npm run types:check
```

"Live demo" and "See it on testnet" open the template's frontend on Hedera testnet (`lib/site.ts`);
`NEXT_PUBLIC_LIVE_DEMO_URL` overrides it.

## Licence

MIT. See [LICENSE](LICENSE).
