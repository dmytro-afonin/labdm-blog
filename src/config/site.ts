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

function normalizeOrigin(origin: string): string {
  return origin.endsWith("/") ? origin.slice(0, -1) : origin;
}

/**
 * Origin for links that must hit *this* deployment (confirm/manage emails).
 * Preview uses `VERCEL_URL`; production and local default keep {@link siteConfig.url}.
 * Canonical/SEO links should keep using {@link siteConfig.url} / {@link absoluteUrl}.
 */
export function getRuntimeSiteOrigin(options?: {
  /** Full request URL; used only for local http://localhost / 127.0.0.1. */
  requestUrl?: string;
}): string {
  const vercelEnv = process.env.VERCEL_ENV;
  const vercelHost = process.env.VERCEL_URL?.trim().replace(
    /^https?:\/\//i,
    "",
  );

  if (vercelEnv === "preview" && vercelHost) {
    return `https://${vercelHost}`;
  }

  if (vercelEnv === "production") {
    return siteConfig.url;
  }

  if (options?.requestUrl) {
    try {
      const origin = new URL(options.requestUrl).origin;
      if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin === "http://localhost" ||
        origin === "http://127.0.0.1"
      ) {
        return origin;
      }
    } catch {
      // ignore malformed request URL
    }
  }

  if (vercelEnv === "development" && vercelHost) {
    return `https://${vercelHost}`;
  }

  return siteConfig.url;
}

/**
 * Resolve a site-absolute URL. `path` may include query/hash (`/c?token=…`).
 * Do not assign query strings through `URL.pathname` — that encodes `?` as `%3F`.
 * Defaults to the canonical production origin ({@link siteConfig.url}).
 */
export function absoluteUrl(path = "/", origin: string = siteConfig.url) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = `${normalizeOrigin(origin)}/`;
  const normalized = path.startsWith("/") ? path.slice(1) : path;
  return new URL(normalized, base).toString();
}

/** Like {@link absoluteUrl}, but rooted at {@link getRuntimeSiteOrigin}. */
export function absoluteRuntimeUrl(
  path = "/",
  options?: { requestUrl?: string },
) {
  return absoluteUrl(path, getRuntimeSiteOrigin(options));
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
