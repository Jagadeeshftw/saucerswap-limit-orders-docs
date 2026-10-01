import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { site } from "@/lib/site";
import { source } from "@/lib/source";

export const revalidate = false;

/** 1200x630 social card per page (/og/<page url>/image.png) and for the home page (/og/home/image.png). */
export async function GET(_req: Request, { params }: RouteContext<"/og/[...slug]">) {
  const { slug } = await params;
  const path = slug.slice(0, -1);
  let title = "Limit & stop orders on Hedera, with no keeper bot.";
  let kicker = "Scaffold-HBAR template";
  if (!(path.length === 1 && path[0] === "home")) {
    const page = source.getPage(path);
    if (!page) notFound();
    title = page.data.heading;
    kicker = String(page.data.title) === page.data.heading ? "Docs" : String(page.data.title);
  }
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#ffffff", color: "#14151b" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, fontWeight: 700 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#6d4aff,#2d84eb)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>LO</div>
          {site.title}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 26, color: "#6d4aff", fontWeight: 700 }}>{kicker}</div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5, maxWidth: 1000 }}>{title}</div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#5a5d6b" }}>{site.url.replace(/^https?:\/\//, "")}</div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}

export function generateStaticParams() {
  return [{ slug: ["home", "image.png"] }, ...source.getPages().map((p) => ({ slug: [...p.slugs, "image.png"] }))];
}
