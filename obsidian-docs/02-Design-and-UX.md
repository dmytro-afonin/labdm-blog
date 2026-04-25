# Design and reading UX

## Design direction

- **"Olive"** mast: uppercase name row + short tagline (`siteConfig.mastName`, `mastTagline` in `src/config/site.ts`), calm typography, reading-first layout.
- **Palette** driven from `src/config/palette.ts` and SCSS; **theme color** in site config is kept in sync with the favicon note in code comments.
- **Post cards** — date, title, blurb, tags, reading time; index uses a quiet date style (`formatPostDateQuiet`) and a combined excerpt/description when both exist (`previewBlurb` in `src/utils/posts.ts`).

## Layout shell

- **`BaseLayout.astro`** — global head metadata (including `theme-color` per `prefers-color-scheme`), RSS `<link rel="alternate">`, mast, footer area patterns.
- **Article** — `src/pages/posts/[slug].astro` (collection-driven) with tags, `PostUpdatedLine`, `PostDateRead` / reading time, prev/next (see `PostCard` / navigation in codebase).

## Theming

- **OS-driven only:** `src/styles/color-scheme-themes.scss` — light by default, dark when `prefers-color-scheme: dark`. No in-app theme control or `localStorage`; `meta name="theme-color"` uses `media` queries in `BaseLayout.astro` to match.

## Newsletter UI

- **`SubscribeForm.astro`** — inline pill + email, honeypot, POST to `/api/subscribe`. PostHog events for the newsletter run on the server in `/api/subscribe` only (no browser analytics bundle).
- **Result pages** — `src/pages/newsletter/[state].astro` for thanks / already-subscribed / invalid / error (LAB-25, LAB-29).
- **Short confirm link** — `src/pages/c.ts` redirects to confirm handler (used in email links; README documents `/c?token=...`).

## Content rules

- **Drafts** — `draft: true` in frontmatter; hidden in production via `isVisiblePost()` / `getVisiblePosts()` (LAB-20).
- **Authoring** — `docs/authoring-posts.md` remains the how-to; [[06-Features-shipped]] links behavior to file paths.

## SEO / share (not all shipped)

- Primary RSS is **excerpt** in `<description>` (LAB-27). Full-content feed, canonical/OG, sitemap are backlog — see [[08-Backlog-and-roadmap]].
