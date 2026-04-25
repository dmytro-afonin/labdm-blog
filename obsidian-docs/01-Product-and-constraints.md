# Product and constraints

## One-liner

A **personal / lab tech blog** at the canonical host `https://blog.labdm.dev` — static-first, fast to read, with a **real newsletter** backed by **Neon Postgres** and **Resend**, and **CI-gated** delivery to Vercel.

## Goals

- Publish long-form **Markdown** posts with predictable URLs and RSS.
- **Subscribe** visitors with double opt-in, sync contacts to a mail provider, and let users **manage** subscription without a separate app backend (Convex, etc.).
- Keep **operational cost and moving parts** low: one Astro codebase, one DB, one email vendor.

## Non-goals (explicit)

- **Not** using Convex in this repository (historical tickets may reference it; the chosen stack is Vercel server routes + Neon).
- **Not** a multi-author CMS or a headless CMS with draft previews on a different origin (unless you add that later; currently drafts are a frontmatter flag + `isVisiblePost()`).
- **Not** a comment system or real-time community layer by default; engagement ideas are optional **M6** and storage is flexible (Neon, edge) — not prescribed as Convex.

## Personas (lightweight)

- **Reader** — skims home, opens posts, may subscribe, uses RSS.
- **Author (you)** — writes `src/content/posts/*.md`, runs `bun run build`, opens PRs.
- **Operator** — manages Neon, Resend webhooks, Vercel env, and occasional `bun run newsletter:sync*`.

## Success metrics (product-level, optional)

- Newsletter: verified signups, sync health (`sync_status` in Neon, Resend webhook logs).
- Reach: can add PostHog funnels; see [[03-Ecosystem]] and backlog [[08-Backlog-and-roadmap]].
- Reliability: Quality CI green, preview deploys on PRs, production on `main`.

## Linear / Obsidian

The Linear project **"Personal Blog"** captured roadmap language; this vault is the living narrative. If a feature is documented here and implemented, treat the doc as the definition of done, not a stale card.
