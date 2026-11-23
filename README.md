# labdm-blog

A pnpm-based Astro blog with GitHub Actions validation and Vercel Git deployments.

## Stack

- Astro 7 (Vite 8) for the site
- Bun for installs and scripts (`.npmrc`: **isolated** linker, no dependency hoisting, 1-day `minimumReleaseAge`, Socket install scanner, `exact` versions on add)
- TypeScript 6 + `astro check` (TS 7 blocked until `@astrojs/check` supports it)
- Oxlint + Prettier + Stylelint for quality gates
- GitHub Actions for validation; Vercel Git integration for deploys
- Vercel for preview and production hosting

## Production domain assumptions

- The canonical production URL is `https://blog.labdm.dev`.
- Astro config uses this host as the site URL for future canonical metadata, feeds, and sitemap generation.
- Vercel preview deployments are for validation only and should not become the canonical host.

## Local development

```bash
pnpm install
pnpm run dev
```

- **`pnpm run dev`** — Astro dev server (default). API routes work here.
- **`pnpm run dev:vercel`** — `pnpm exec vercel@58.8.0 dev` with Vercel routing and env parity. The CLI is **not** a package.json dependency (Vercel’s remote builder ignores it and warns if present). The `dev` script must stay **`astro dev`** so `vercel dev` does not recurse; `vercel.json` sets `devCommand` to `pnpm run dev`.

Useful scripts:

- `pnpm run typecheck`
- `pnpm run build`
- `pnpm run build && pnpm run preview` — static server for `dist/client` (Vercel adapter output; run `build` first). Use `pnpm run dev` for API routes.
- `pnpm run newsletter:sync`
- `pnpm run newsletter:sync:report`

## Newsletter subscriber platform

The blog stores newsletter subscribers in Neon and treats that table as the
source of truth for subscriber state.

Environment variables:

- `POSTGRES_URL`
- `RESEND_API_KEY` — send-capable Resend key for newsletter confirmation emails; may also be used for Contacts sync if it is full-access
- `RESEND_CONTACTS_API_KEY` — full-access Resend key for the Contacts API (`newsletter:sync`). If omitted, `RESEND_API_KEY` is used and must not be send-only
- `RESEND_FROM_EMAIL` — verified sender address for newsletter confirmation emails
- `RESEND_WEBHOOK_SECRET`
- `RESEND_SEGMENT_ID` — Resend segment for this environment (`blog-prod` / `blog-preview`); contacts are added here on sync
- `NEWSLETTER_TOKEN_SECRET`
- `PUBLIC_POSTHOG_PROJECT_TOKEN` / `PUBLIC_POSTHOG_HOST` (optional) — server-side PostHog in API routes only; no browser SDK bundle on static pages.

**Database migrations:** SQL lives in `db/migrations/`. Apply with `pnpm run db:migrate` (uses `POSTGRES_URL` or `DATABASE_URL`). On Vercel, `buildCommand` runs migrations before the site build so **Sensitive** Neon URLs work (they are not readable via `vercel env pull`). For local migrate, paste the connection string from Neon into `.env.local`. Use `pnpm run db:migrate:dry-run` to list pending files. Never edit an already-applied migration — add a new numbered file instead.

**Runtime:** `vercel.json` can set `regions` (e.g. `iad1`) near **Neon in `us-east-1`** to reduce DB latency. Edge middleware adds **`x-request-id`** on responses (aligned with Vercel’s id when present) for logs and PostHog.

Current subscriber flows:

- `POST /api/subscribe` creates or refreshes a local pending subscriber record
  and sends a confirmation email. New signups are not synced to Resend Contacts
  until the address is verified.
- `GET /c?token=...` (short link used in emails; redirects to the handler below)
  verifies the email address; `GET /api/newsletter/confirm?token=...` is the same
  handler and still works for older links. Confirmation uses **one** Neon `UPDATE`
  (subscriber id + email from the token) to set `verified_at` and return the row;
  **Resend Contacts sync** after confirm runs in the background via `waitUntil`
  when needed, so the redirect is not blocked on Resend.
- `/newsletter/manage/[token]` lets a subscriber unsubscribe or re-subscribe
  via a signed management link.
- `pnpm run newsletter:sync` manually pushes verified subscribers that are in a
  pending sync state or that previously failed to sync to Resend Contacts.
- `pnpm run newsletter:sync:report` prints sync counts, including unverified
  local subscribers that are still waiting on email confirmation.
- `POST /api/webhooks/resend/contacts` reconciles Resend `contact.created`,
  `contact.updated`, and `contact.deleted` events back into Neon.

Recommended Resend setup:

1. Add a webhook in Resend pointing at `/api/webhooks/resend/contacts`.
2. Subscribe that webhook to `contact.created`, `contact.updated`, and
   `contact.deleted`.
3. Store the webhook signing secret in `RESEND_WEBHOOK_SECRET`.
4. Use `pnpm run newsletter:sync` only for retries or backlog cleanup when
   `newsletter:sync:report` shows failed or pending rows.

## Deployment flow

- Pull requests and pushes to `main` run the `Quality` job (format, lint, typecheck, build, smoke).
- `vercel.json` leaves Vercel Git deployments enabled, so PRs and `main` deploy directly on Vercel.
- Vercel's GitHub integration deploys **preview** (on PRs) and **production** (on `main`); the remote build runs `pnpm run db:migrate && pnpm run build`.
- Production is expected to serve `https://blog.labdm.dev`.

No `VERCEL_*` repository secrets are needed for deploys.

See `CONTRIBUTING.md` for branch protection and merge policy.
