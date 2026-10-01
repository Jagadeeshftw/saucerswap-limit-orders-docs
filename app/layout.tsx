import type { Metadata, Viewport } from "next";
import { RootProvider } from "fumadocs-ui/provider/next";
import { Montserrat } from "next/font/google";
import { site } from "@/lib/site";
import "./global.css";

const sans = Montserrat({ subsets: ["latin"], variable: "--font-montserrat", display: "swap" });

const description =
  "Docs for the saucerswap-limit-orders Scaffold-HBAR template: keeperless limit, stop and trailing-stop orders on SaucerSwap V2, run by the Hedera Schedule Service.";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.title} docs`, template: `%s · ${site.title}` },
  description,
  applicationName: site.title,
  openGraph: { type: "website", siteName: site.title, locale: "en_US", images: [{ url: "/og/home/image.png", width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111219" },
  ],
};

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={sans.variable} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider search={{ options: { type: "static" } }}>{children}</RootProvider>
      </body>
    </html>
  );
}
