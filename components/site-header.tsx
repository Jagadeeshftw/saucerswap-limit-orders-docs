"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { FullSearchTrigger, SearchTrigger } from "fumadocs-ui/layouts/shared/slots/search-trigger";
import { ThemeSwitch } from "fumadocs-ui/layouts/shared/slots/theme-switch";
import { Logo } from "@/components/logo";
import { GitHubIcon } from "@/components/github-icon";
import { navLinks } from "@/lib/layout.shared";
import { site } from "@/lib/site";

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
