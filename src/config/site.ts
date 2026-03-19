export const siteConfig = {
  name: "labdm blog",
  title: "Dmytro Afonin — labdm blog",
  description:
    "My personal thoughts on trends and news in AI, developer tools, the web, and IT in general.",
  url: "https://blog.labdm.dev",
  lang: "en",
  feeds: [
    {
      path: "/rss.xml",
      title: "labdm blog RSS feed",
      type: "application/rss+xml",
    },
  ],
} as const;

export function getPageTitle(pageTitle?: string) {
  return pageTitle ? `${pageTitle} | ${siteConfig.name}` : siteConfig.title;
}

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}
