import { palette } from "./palette";

/** Where global social links appear (LinkedIn, X, GitHub). Set URLs in `socialLinks`. */
export const SocialPlacement = {
  MAST_TOOLS: 1,
  BELOW_MAST: 2,
  AFTER_CONTENT: 3,
  FIXED_BOTTOM: 4,
  HEADER_BOTTOM: 5,
} as const;

export type SocialPlacement =
  (typeof SocialPlacement)[keyof typeof SocialPlacement];

/** All valid `SocialPlacement` numeric values (for runtime checks). */
export const SOCIAL_PLACEMENT_VALUES = Object.values(
  SocialPlacement,
) as readonly SocialPlacement[];

export function isValidSocialPlacement(
  value: unknown,
): value is SocialPlacement {
  return (
    typeof value === "number" &&
    (SOCIAL_PLACEMENT_VALUES as readonly number[]).includes(value)
  );
}

/** Use for config-driven placement so invalid/missing values default to mast tools. */
export function resolveSocialPlacement(value: unknown): SocialPlacement {
  if (isValidSocialPlacement(value)) return value;
  return SocialPlacement.MAST_TOOLS;
}

export type SocialNetwork = "linkedin" | "x" | "github";

export const socialPlacementLabels: Record<SocialPlacement, string> = {
  [SocialPlacement.MAST_TOOLS]: "Mast — next to RSS (icon chips)",
  [SocialPlacement.BELOW_MAST]: "Strip — under mast (text links)",
  [SocialPlacement.AFTER_CONTENT]: "Footer — bottom of every page",
  [SocialPlacement.FIXED_BOTTOM]: "Fixed — bottom bar (thumb zone)",
  [SocialPlacement.HEADER_BOTTOM]:
    "Rail — fixed right on wide screens; strip under mast on narrow",
};

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
  /** Pick layout; see `socialPlacementLabels`. */
  socialPlacement: SocialPlacement.MAST_TOOLS,
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
