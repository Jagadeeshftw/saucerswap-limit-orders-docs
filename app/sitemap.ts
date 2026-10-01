import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { source } from "@/lib/source";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(site.source.date);
  return [
    { url: site.url, lastModified, priority: 1 },
    ...source.getPages().map((p) => ({ url: `${site.url}${p.url}`, lastModified, priority: 0.7 })),
  ];
}
