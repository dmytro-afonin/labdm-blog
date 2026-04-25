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

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
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
