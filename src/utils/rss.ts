import type { BlogPost } from "./posts";

/**
 * Short summary for RSS `<description>`: frontmatter `excerpt` if present, else `description`.
 */
export function getRssItemDescription(post: BlogPost): string {
  const excerpt = post.data.excerpt?.trim();
  if (excerpt) {
    return excerpt;
  }
  return post.data.description;
}

/**
 * `]]>` cannot appear inside CDATA; split so the feed remains well-formed.
 */
function escapeCdataBody(html: string): string {
  return html.replaceAll("]]>", "]]]]><![CDATA[>");
}

/**
 * Returns a full `<content:encoded>...</content:encoded>` line, or an empty string if there is no HTML.
 */
export function formatRssContentEncoded(html: string | undefined): string {
  if (html === undefined || html.length === 0) {
    return "";
  }
  return `<content:encoded><![CDATA[${escapeCdataBody(html)}]]></content:encoded>`;
}
