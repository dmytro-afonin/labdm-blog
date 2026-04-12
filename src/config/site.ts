import { palette } from "./palette";

export type SocialNetwork = "linkedin" | "x" | "github";

export const siteConfig = {
  name: "Dmytro Afonin - labdm blog",
  /** Masthead: uppercase name row + tagline (Olive layout). */
  mastName: "Dmytro Afonin",
  mastTagline: "Thoughts about tech and development",
  /**
   * Browser chrome / PWA tint. Keep the active favicon background (e.g.
   * `public/favicon.svg`) in sync with `palette["theme-green"]`
   * in `src/config/palette.ts`.
   */
  themeColor: palette["theme-green"],
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
  /** Full URLs (https). Leave blank to hide that network. */
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
  const s = siteConfig.socialLinks;
  const out: Array<{ key: SocialNetwork; href: string; label: string }> = [];
  const li = s.linkedin.trim();
  const x = s.x.trim();
  const gh = s.github.trim();
  if (li) out.push({ key: "linkedin", href: li, label: "LinkedIn" });
  if (x) out.push({ key: "x", href: x, label: "X (Twitter)" });
  if (gh) out.push({ key: "github", href: gh, label: "GitHub" });
  return out;
}

/** Uses the same `socialLinks` keys as {@link getSocialLinkItems} without building the full list. */
export function hasSocialLinks(): boolean {
  const s = siteConfig.socialLinks;
  for (const url of [s.linkedin, s.x, s.github]) {
    if (url.trim()) return true;
  }
  return false;
}
