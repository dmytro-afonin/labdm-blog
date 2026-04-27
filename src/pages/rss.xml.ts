import { siteConfig, absoluteUrl } from "../config/site";
import { formatRssContentEncoded, getRssItemDescription } from "../utils/rss";
import { getPostUrl, getVisiblePosts } from "../utils/posts";

export const prerender = true;

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function GET() {
  const posts = await getVisiblePosts();
  const lastBuildDate = new Date().toUTCString();

  const itemsXml = posts
    .map((post) => {
      const link = absoluteUrl(getPostUrl(post));
      const pubDate = post.data.pubDate.toUTCString();
      const summary = getRssItemDescription(post);
      const fullHtml = formatRssContentEncoded(post.rendered?.html);

      return `    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${escapeXml(pubDate)}</pubDate>
      <description>${escapeXml(summary)}</description>${
        fullHtml ? `\n      ${fullHtml}` : ""
      }
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(siteConfig.title)}</title>
    <description>${escapeXml(siteConfig.description)}</description>
    <link>${escapeXml(siteConfig.url)}</link>
    <language>${escapeXml(siteConfig.lang)}</language>
    <generator>Astro 6.1.9</generator>
    <copyright>Copyright © ${escapeXml(String(new Date().getUTCFullYear()))}, ${escapeXml(siteConfig.copyrightOwner)}.</copyright>
    <lastBuildDate>${escapeXml(lastBuildDate)}</lastBuildDate>
    <atom:link href="${escapeXml(absoluteUrl("/rss.xml"))}" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
