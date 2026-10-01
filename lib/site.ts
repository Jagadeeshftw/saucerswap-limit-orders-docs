import sourceInfo from "@/content/source.json";

/** Site-wide names and links. Page text never lives here: it comes from the template repo. */
export const site = {
  name: "Limit Orders",
  title: "SaucerSwap Limit Orders",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://limit-orders.0xo.in",
  github: "https://github.com/Jagadeeshftw/saucerswap-limit-orders",
  docsRepo: "https://github.com/Jagadeeshftw/saucerswap-limit-orders-docs",
  /** The template's frontend on Hedera testnet (Vercel project saucerswap-limit-orders-demo, built from main). */
  liveDemo: process.env.NEXT_PUBLIC_LIVE_DEMO_URL || "https://saucerswap-limit-orders-demo.vercel.app",
  createCommand: "npm create scaffold-hbar@latest my-app -- --template Jagadeeshftw/saucerswap-limit-orders",
  source: sourceInfo,
};
