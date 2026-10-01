"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { FullSearchTrigger, SearchTrigger } from "fumadocs-ui/layouts/shared/slots/search-trigger";
import { ThemeSwitch } from "fumadocs-ui/layouts/shared/slots/theme-switch";
import { Logo } from "@/components/logo";
import { navLinks } from "@/lib/layout.shared";
import { site } from "@/lib/site";

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2 0 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8 0 3.2.9.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1 .9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3" />
    </svg>
  );
}

/** The home page's navbar, laid out like the docs navbar: brand, centred search, links, GitHub, theme. */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const link = "rounded-md px-2.5 py-1.5 text-sm text-fd-muted-foreground hover:text-fd-accent-foreground";
  return (
    <header className="sticky top-0 z-40 border-b bg-fd-background">
      <div className="flex h-14 items-center gap-3 px-4 md:px-6">
        <Link href="/" className="inline-flex items-center gap-2.5 font-bold">
          <Logo />
          {site.name}
        </Link>
        <div className="flex flex-1 justify-center max-md:hidden">
          <FullSearchTrigger className="w-full max-w-sm" />
        </div>
        <nav aria-label="Main" className="flex items-center gap-1 max-md:hidden">
          {navLinks.map((l) => (
            <a key={l.text} href={l.url} className={link}>
              {l.text}
            </a>
          ))}
          <a href={site.github} aria-label="GitHub" className="p-2 text-fd-muted-foreground hover:text-fd-accent-foreground">
            <GitHubIcon />
          </a>
          <ThemeSwitch className="ms-1" />
        </nav>
        <div className="ms-auto flex items-center md:hidden">
          <SearchTrigger hideIfDisabled className="p-2" />
          <button
            type="button"
            className="rounded-md p-2 text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground"
            aria-expanded={open}
            aria-controls="home-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="home-menu" aria-label="Main" className="grid gap-1 border-t px-4 py-3 md:hidden">
          {navLinks.map((l) => (
            <a key={l.text} href={l.url} className={`${link} py-2 text-base`}>
              {l.text}
            </a>
          ))}
          <a href={site.github} className={`${link} py-2 text-base`}>
            GitHub
          </a>
          <ThemeSwitch className="mt-1 justify-self-start" />
        </nav>
      )}
    </header>
  );
}
