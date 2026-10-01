import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { CopyCommand } from "@/components/copy-command";
import { site } from "@/lib/site";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const cards = [
  { title: "Build & run", text: "Scaffold, create a testnet account, place your first order in ten minutes.", href: "/getting-started/quick-start" },
  { title: "Understand", text: "How an order works, the guard, the cost model, and the contract reference.", href: "/guide/architecture" },
  { title: "Extend & ship", text: "Write your own order type, then the checklist to go to mainnet.", href: "/extend/order-types" },
];

export default function HomePage() {
  const { ref, sha, repo } = site.source;
  return (
    <main className="flex flex-1 flex-col">
      <section className="border-b">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-5 px-4 py-14 sm:px-8 sm:py-20">
          <span className="justify-self-start rounded-full bg-fd-accent px-3 py-1 text-xs font-bold text-fd-accent-foreground">Scaffold-HBAR template</span>
          <h1 className="max-w-[18ch] text-4xl leading-[1.1] font-bold tracking-tight text-balance sm:text-5xl">Limit &amp; stop orders on Hedera, with no keeper bot.</h1>
          <p className="max-w-[56ch] text-lg text-fd-muted-foreground">
            Escrow a token, get an NFT that is your order, and let the Hedera Schedule Service run the checks. A Chainlink-vs-TWAP guard gates every fill.
          </p>
          <div className="max-w-[54rem]">
            <CopyCommand command={site.createCommand} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/getting-started/quick-start" className="rounded-xl bg-fd-primary px-5 py-2.5 text-sm font-bold text-fd-primary-foreground hover:opacity-90">
              Get started
            </Link>
            <a href={site.liveDemo} className="inline-flex items-center gap-1 rounded-xl border px-5 py-2.5 text-sm font-semibold hover:bg-fd-accent hover:text-fd-accent-foreground">
              See it on testnet <ArrowUpRight className="size-4" aria-hidden />
            </a>
          </div>
        </div>
      </section>
      <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-10 sm:grid-cols-3 sm:px-8">
        {cards.map((c) => (
          <Link key={c.title} href={c.href} className="grid content-start gap-1.5 rounded-2xl border bg-fd-card p-5 hover:border-fd-primary/50 hover:bg-fd-accent/60">
            <h2 className="font-bold">{c.title}</h2>
            <p className="text-sm text-fd-muted-foreground">{c.text}</p>
          </Link>
        ))}
      </section>
      <footer className="mt-auto border-t">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap justify-between gap-2 px-4 py-6 text-xs text-fd-muted-foreground sm:px-8">
          <span>
            Built from{" "}
            <a className="underline underline-offset-4 hover:text-fd-foreground" href={`${repo}/tree/${ref}`}>
              saucerswap-limit-orders@{ref}
            </a>{" "}
            ({sha.slice(0, 7)})
          </span>
          <a className="underline underline-offset-4 hover:text-fd-foreground" href={`${repo}/blob/${ref}/LICENSE`}>
            MIT licence
          </a>
        </div>
      </footer>
    </main>
  );
}
