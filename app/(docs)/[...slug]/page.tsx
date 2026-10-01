import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsBody, DocsPage, DocsTitle } from "fumadocs-ui/layouts/notebook/page";
import { getMDXComponents } from "@/components/mdx";
import { site } from "@/lib/site";
import { source } from "@/lib/source";

export default async function Page(props: PageProps<"/[...slug]">) {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();
  const MDX = page.data.body;
  const { ref, sha } = site.source;

  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.heading}</DocsTitle>
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
      <p className="border-t pt-4 text-sm text-fd-muted-foreground" data-source-sha={sha}>
        From <code className="font-mono text-[0.85em]">{page.data.sourcePath}</code> at{" "}
        <code className="font-mono text-[0.85em]">
          {ref} ({sha.slice(0, 7)})
        </code>{" "}
        ·{" "}
        <a className="font-medium text-fd-primary underline-offset-4 hover:underline" href={page.data.sourceUrl}>
          View source
        </a>
      </p>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: PageProps<"/[...slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const page = source.getPage(slug);
  if (!page) notFound();
  const image = `/og${page.url}/image.png`;
  return {
    title: page.data.heading,
    description: page.data.description,
    alternates: { canonical: page.url },
    openGraph: { title: page.data.heading, description: page.data.description, url: page.url, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: page.data.heading, description: page.data.description, images: [image] },
  };
}
