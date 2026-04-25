# Architecture

## High level

- **Astro 6** site with **content collections** for posts (`src/content.config.ts` → `src/content/posts/*.md`).
- **Default: static prerender**; **serverless** only where needed (API routes, non-prerendered endpoints).
- **@astrojs/vercel** — production server functions for `output: "static"` hybrid (static pages + API routes).

## Route map (main)

| Path                            | Role                                                         |
| ------------------------------- | ------------------------------------------------------------ |
| `/`                             | Home / recent posts (index)                                  |
| `/posts/[slug]/`                | Article from collection `id` = filename stem                 |
| `/tags/[tag]/`                  | Tag archive (slugified tags)                                 |
| `/rss.xml`                      | Excerpt-style RSS (LAB-27)                                   |
| `/c`                            | Short token redirect for email confirmation                  |
| `/api/subscribe`                | `POST` — create/update pending subscriber, send confirmation |
| `/api/newsletter/confirm`       | Double opt-in completion                                     |
| `/api/newsletter/manage`        | Unsubscribe / re-subscribe with signed token                 |
| `/api/webhooks/resend/contacts` | Inbound Resend contact events                                |
| `/newsletter/*`                 | Static result and management pages                           |

## Key directories

| Path                 | Purpose                                                                |
| -------------------- | ---------------------------------------------------------------------- |
| `src/config/`        | `site.ts`, `palette.ts` — branding, URLs, palette tokens for CSS       |
| `src/content/posts/` | Markdown + frontmatter                                                 |
| `src/components/`    | Astro components (PostCard, SubscribeForm, etc.)                       |
| `src/layouts/`       | `BaseLayout.astro`                                                     |
| `src/lib/`           | Neon, Resend, newsletter tokens, PostHog server                        |
| `src/pages/`         | File-based routes                                                      |
| `src/utils/posts.ts` | Visibility, sort, reading time, tag helpers                            |
| `db/migrations/`     | SQL for Neon                                                           |
| `scripts/`           | `newsletter-sync.ts`, `newsletter-sync-report.ts`, `smoke-preview.mjs` |

## Visibility and data loading

- **`getVisiblePosts()`** — `getCollection("posts", isVisiblePost)`; in **dev**, drafts visible; in **prod**, `draft: true` excluded.
- **RSS and indexes** should use the same visibility helpers (implemented per routes — verify when changing).

## Security-sensitive patterns

- **Newsletter tokens** — HMAC or signed links via `NEWSLETTER_TOKEN_SECRET` and dedicated helpers in `src/lib/newsletter*`.
- **Webhooks** — verify Resend/Svix signatures before mutating DB.

## Build / preview

- **`bun run build`** — fails on schema violations in frontmatter.
- **`bun run smoke`** — fetches local preview and checks for expected HTML snippets (see `package.json` `smoke.expectedSnippets`).
