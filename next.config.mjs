import { createMDX } from "fumadocs-mdx/next";

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  turbopack: { root: import.meta.dirname },
  async redirects() {
    return [
      { source: "/getting-started", destination: "/getting-started/introduction", permanent: false },
      { source: "/guide", destination: "/guide/architecture", permanent: false },
      { source: "/extend", destination: "/extend/order-types", permanent: false },
      { source: "/reference", destination: "/reference/contract-api", permanent: false },
    ];
  },
};

export default createMDX()(config);
