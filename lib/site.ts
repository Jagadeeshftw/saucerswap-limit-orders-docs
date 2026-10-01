import sourceInfo from "@/content/source.json";

/** Site-wide names and links. Page text never lives here: it comes from the template repo. */
export const site = {
  name: "Limit Orders",
  title: "SaucerSwap Limit Orders",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://limit-orders.0xo.in",
  github: "https://github.com/Jagadeeshftw/saucerswap-limit-orders",
  docsRepo: "https://github.com/Jagadeeshftw/saucerswap-limit-orders-docs",
  /** The deployed testnet app; until there is one, the testnet vault on HashScan as named by the README. */
  liveDemo: process.env.NEXT_PUBLIC_LIVE_DEMO_URL || sourceInfo.vaultUrl || "https://hashscan.io/testnet",
  createCommand: "npm create scaffold-hbar@latest my-app -- --template Jagadeeshftw/saucerswap-limit-orders",
  source: sourceInfo,
};
