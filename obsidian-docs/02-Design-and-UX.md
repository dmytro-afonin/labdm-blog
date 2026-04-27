# Design and reading UX

## Design direction

- **"Olive"** mast: uppercase name row + short tagline (`siteConfig.mastName`, `mastTagline` in `src/config/site.ts`), calm typography, reading-first layout.
- **Palette** driven from `src/config/palette.ts` and global CSS in `src/styles/color-scheme-themes.css`; **theme color** in `BaseLayout.astro` uses fixed light/dark values with `prefers-color-scheme` media on `meta name="theme-color"`.
- **Post cards** — date, title, blurb, tags, reading time; index uses a quiet date style (`formatPostDateQuiet`) and a combined excerpt/description when both exist (`previewBlurb` in `src/utils/posts.ts`).

## Layout shell

- **`BaseLayout.astro`** — global head metadata (including `theme-color` per `prefers-color-scheme`), RSS `<link rel="alternate">`, mast, subscribe row, footer.
- **Article** — `src/pages/posts/[slug].astro` with **`Crumbs.astro`** (breadcrumb `<nav>` + `<ol>`: “All posts” link uses `import.meta.env.BASE_URL`; slot supplies `<li>` items; `/` separators via CSS), **`PostTags`**, reading-time label, prev/next links.

## Theming

- **OS-driven only:** `src/styles/color-scheme-themes.css` — light by default, dark when `prefers-color-scheme: dark`. No in-app theme toggle or `localStorage`.

## Newsletter UI

- **`SubscribeForm.astro`** — inline pill + email, honeypot, POST to `/api/subscribe`. PostHog events for the newsletter run on the server in `/api/subscribe` only (no browser analytics bundle).
- **Result pages** — `src/pages/newsletter/[state].astro` for thanks / already-subscribed / invalid / error (LAB-25, LAB-29).
- **Short confirm link** — `src/pages/c.ts` redirects to confirm handler (used in email links; README documents `/c?token=...`).

## Content rules

- **Drafts** — `draft: true` in frontmatter; hidden in production via `isVisiblePost()` / `getVisiblePosts()` (LAB-20).
- **Authoring** — `docs/authoring-posts.md` remains the how-to.

## SEO / share (not all shipped)

- Primary RSS is **excerpt** in `<description>` (LAB-27). Full-content feed and sitemap refinements remain backlog (see product notes in this vault / Linear).
