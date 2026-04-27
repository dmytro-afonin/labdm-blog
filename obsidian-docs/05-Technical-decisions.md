# Technical decisions (ADR-style)

## Static-first Astro on Vercel

**Context:** A blog should be fast, cheap, and easy to cache.

**Decision:** `output: "static"` in `astro.config.ts`, with **Vercel adapter** so **API routes** can stay serverless where dynamic behavior is required (newsletter, webhooks).

**Consequence:** Most pages are prerendered; API routes are explicit server entrypoints. Env vars must be set in Vercel for production API behavior.

## Neon for subscriber state (not Convex)

**Context:** Early roadmap text sometimes referenced Convex. Operating a second backend for a small blog adds surface area.

**Decision:** **Neon serverless Postgres** is the system of record for `subscribers` and sync metadata; Astro **Route handlers** + `@neondatabase/serverless` perform writes/reads.

**Consequence:** No real-time DB subscriptions from the server product; for a newsletter this is acceptable. Migrations are manual SQL in `db/migrations/`.

## Excerpt RSS as default

**Context:** Some readers want full text in the reader; some publishers prefer teaser-only feeds to drive traffic.

**Decision:** **Primary** `/rss.xml` uses per-item **description = excerpt** (teaser), LAB-27. A **second full-content** feed is optional (LAB-18, backlog).

## Quality before deploy

**Context:** Broken builds on `main` waste time and hurt trust.

**Decision:** `vercel.json` disables automatic Git-triggered Vercel deploys; **GitHub Actions** runs Quality then **conditionally** runs Vercel deploy with CLI when `VERCEL_`* secrets exist.

**Consequence:** Slightly more CI configuration; predictability in what reaches preview/production.

## Review automation

**Decision (M0):** **CodeRabbit** and **Greptile** are integrated for PR feedback (issues LAB-5, LAB-8), alongside human review policy in `CONTRIBUTING.md`.

## Open choices (document when decided)

- **CI runners:** Depo vs **Blacksmith** vs stock GitHub — spikes LAB-9, LAB-11 are **backlog**; no code commitment yet.
- **Search:** **Pagefind** (LAB-45) vs other static search.
- **Pagination:** home listing growth (LAB-26).