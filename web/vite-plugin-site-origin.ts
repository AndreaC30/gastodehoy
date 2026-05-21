import type { Plugin } from "vite";
import { writeFileSync } from "node:fs";
import path from "node:path";

/** Hostname or full origin from SITE_DOMAIN / VITE_SITE_ORIGIN. */
export function resolveSiteOrigin(raw: string | undefined): string | null {
  const d = raw?.trim();
  if (!d) return null;
  if (d.startsWith("http://") || d.startsWith("https://")) {
    return d.replace(/\/+$/, "");
  }
  return `https://${d.replace(/\/+$/, "")}`;
}

function homepageUrl(origin: string): string {
  return `${origin}/`;
}

function ogImageUrl(origin: string): string {
  return `${origin}/og-image.png`;
}

function sitemapXml(origin: string, lastmod: string): string {
  const loc = homepageUrl(origin);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
}

/**
 * Injects absolute canonical / Open Graph URLs from SITE_DOMAIN at build time.
 * Dev without SITE_DOMAIN keeps relative paths; with SITE_DOMAIN uses that origin.
 */
export function siteOriginPlugin(
  siteDomain: string | undefined,
  mode: string,
): Plugin {
  let outDir = "dist";
  const configured = resolveSiteOrigin(siteDomain);
  const origin =
    configured ??
    (mode === "development" ? "http://localhost:5173" : null);

  return {
    name: "gastodehoy-site-origin",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    transformIndexHtml(html) {
      if (!origin) {
        if (mode === "production") {
          console.warn(
            "[gastodehoy-site-origin] SITE_DOMAIN no definido: canonical y og:url siguen relativos. " +
              "Define SITE_DOMAIN en .env antes de npm run build.",
          );
        }
        return html;
      }
      const home = homepageUrl(origin);
      const image = ogImageUrl(origin);
      return html
        .replace(
          /<link rel="canonical" href="[^"]*"\s*\/>/,
          `<link rel="canonical" href="${home}" />`,
        )
        .replace(
          /<meta property="og:url" content="[^"]*"\s*\/>/,
          `<meta property="og:url" content="${home}" />`,
        )
        .replace(
          /<meta property="og:image" content="[^"]*"\s*\/>/,
          `<meta property="og:image" content="${image}" />`,
        )
        .replace(
          /<meta name="twitter:image" content="[^"]*"\s*\/>/,
          `<meta name="twitter:image" content="${image}" />`,
        );
    },
    closeBundle() {
      if (!origin || mode !== "production") return;
      const lastmod = new Date().toISOString().slice(0, 10);
      const target = path.resolve(outDir, "sitemap.xml");
      writeFileSync(target, sitemapXml(origin, lastmod), "utf-8");
    },
  };
}
