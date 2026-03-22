# Authoring posts

Posts are Markdown files in **`src/content/posts/`**, one file per article. The filename should match the **`slug`** in frontmatter (recommended: `{slug}.md`).

## Frontmatter

Every post is validated at build time by the schema in [`src/content.config.ts`](../src/content.config.ts).

| Field         | Required | Notes                                                                 |
| ------------- | -------- | --------------------------------------------------------------------- |
| `title`       | yes      | Display title.                                                        |
| `slug`        | yes      | Lowercase **kebab-case** URL segment; use only `a-z`, `0-9`, and `-`. |
| `description` | yes      | Short summary for SEO and feeds.                                      |
| `pubDate`     | yes      | ISO date or date-time (e.g. `2026-03-22`).                            |
| `updatedDate` | no       | Optional last-updated date.                                           |
| `excerpt`     | no       | Optional shorter blurb for cards or listings.                         |
| `draft`       | no       | Default **`false`**. Set to **`true`** for work in progress.          |
| `tags`        | no       | List of strings; default `[]`.                                        |

Example:

```yaml
---
title: "My first article"
slug: my-first-article
description: "What this post is about in one line."
pubDate: 2026-03-22
updatedDate: 2026-03-23
excerpt: "Optional teaser for list views."
draft: false
tags:
  - web
  - astro
---
```

## Draft rules

- **`draft: false` (default)** — Treat as publishable once you ship listing and article routes, RSS, and sitemap logic.
- **`draft: true`** — Still must pass schema validation and can be previewed locally, but **must not** appear in production post indexes, RSS feeds, or sitemaps. Implement that filtering when you add those routes (see project tickets for drafts in production).

During development you may choose to show drafts on listing pages; gate that with `import.meta.env.DEV` so production behavior stays strict.

## Workflow

1. Copy an existing post or add `your-slug.md` under `src/content/posts/`.
2. Fill required frontmatter; run `bun run build` or `bun run dev` to catch schema errors early.
3. Write the body in Markdown below the closing `---`.

## Related files

- Collection loader and schema: `src/content.config.ts`
- Example published post: `src/content/posts/welcome-to-labdm-blog.md`
- Example draft: `src/content/posts/example-draft-post.md`
