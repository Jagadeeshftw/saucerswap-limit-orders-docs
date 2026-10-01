import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { site } from "@/lib/site";
import { Logo } from "@/components/logo";
import { GitHubIcon } from "@/components/github-icon";

export const navLinks = [
  { text: "Guide", url: "/guide/architecture" },
  { text: "Reference", url: "/reference/contract-api" },
  { text: "Live demo", url: site.liveDemo, external: true },
];

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="inline-flex items-center gap-2.5 font-bold">
          <Logo />
          {site.name}
        </span>
      ),
      url: "/",
    },
    links: [
      ...navLinks.map((l) => ({ ...l, active: "none" as const })),
      { type: "icon", label: "GitHub", text: "GitHub", url: site.github, external: true, icon: <GitHubIcon /> },
    ],
  };
}
