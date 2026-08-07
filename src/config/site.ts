export type SocialNetwork = "linkedin" | "x" | "github";

/** Canonical order + labels for {@link siteConfig.socialLinks} keys. */
export const socialNetworkMeta: ReadonlyArray<{
  key: SocialNetwork;
  label: string;
}> = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "x", label: "X (Twitter)" },
  { key: "github", label: "GitHub" },
];

export const siteConfig = {
  name: "Dmytro Afonin - labdm blog",
  /** Masthead: uppercase name row + tagline (Olive layout). */
  mastName: "Dmytro Afonin",
  mastTagline: "Thoughts about tech and development",
  title: "Dmytro Afonin — labdm blog",
  description: "Thoughts about tech and development",
  /** Used in RSS/Atom `&lt;copyright&gt;` (year is added at build time). */
  copyrightOwner: "Dmytro Afonin",
  url: "https://blog.labdm.dev",
  lang: "en",
  feeds: [
    {
      path: "/rss.xml",
      title: "labdm blog RSS feed",
      type: "application/rss+xml",
    },
  ],
  /** Full URLs (https). */
  socialLinks: {
    linkedin: "https://www.linkedin.com/in/dmytro-afonin/",
    x: "https://x.com/DAfonin18409",
    github: "https://github.com/dmytro-afonin",
  },
} as const;

export function getPageTitle(pageTitle?: string) {
  return pageTitle ? `${pageTitle} | ${siteConfig.name}` : siteConfig.title;
}

/**
 * Resolve a site-absolute URL. `path` may include query/hash (`/c?token=…`).
 * Do not assign query strings through `URL.pathname` — that encodes `?` as `%3F`.
 */
export function absoluteUrl(path = "/") {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = siteConfig.url.endsWith("/")
    ? siteConfig.url
    : `${siteConfig.url}/`;
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return new URL(normalized, base).toString();
}

export function getSocialLinkItems(): Array<{
  key: SocialNetwork;
  href: string;
  label: string;
}> {
  return socialNetworkMeta.map(({ key, label }) => ({
    key,
    href: siteConfig.socialLinks[key].trim(),
    label,
  }));
}
