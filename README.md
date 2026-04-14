# labdm-blog

A Bun-first Astro blog with GitHub-based delivery and Vercel deployment automation.

## Stack

- Astro for the site
- Bun for installs and scripts
- GitHub Actions for validation and Vercel deploy orchestration
- Vercel for preview and production hosting

## Production domain assumptions

- The canonical production URL is `https://blog.labdm.dev`.
- Astro config uses this host as the site URL for future canonical metadata, feeds, and sitemap generation.
- Vercel preview deployments are for validation only and should not become the canonical host.

## Local development

```bash
bun install
bun run dev
```

Useful scripts:

- `bun run typecheck`
- `bun run build`
- `bun run preview`
- `bun run newsletter:sync`
- `bun run newsletter:sync:report`

## Newsletter subscriber platform

The blog stores newsletter subscribers in Neon and treats that table as the
source of truth for subscriber state.

Environment variables:

- `POSTGRES_URL`
- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `NEWSLETTER_TOKEN_SECRET`

Current subscriber flows:

- `POST /api/subscribe` captures or re-subscribes a local subscriber record.
- `/newsletter/manage/[token]` lets a subscriber unsubscribe or re-subscribe
  via a signed management link.
- `bun run newsletter:sync` manually pushes pending or failed subscriber rows
  to Resend Contacts.
- `bun run newsletter:sync:report` prints current sync counts and failed rows.
- `POST /api/resend/webhook` reconciles Resend `contact.created`,
  `contact.updated`, and `contact.deleted` events back into Neon.

Recommended Resend setup:

1. Add a webhook in Resend pointing at `/api/resend/webhook`.
2. Subscribe that webhook to `contact.created`, `contact.updated`, and
   `contact.deleted`.
3. Store the webhook signing secret in `RESEND_WEBHOOK_SECRET`.
4. Run `bun run newsletter:sync` after local subscriber changes or whenever
   `newsletter:sync:report` shows failed rows.

## Deployment flow

- Pull requests and pushes to `main` run the `Quality` job (format, lint, typecheck, build, smoke).
- `vercel.json` disables Vercel’s automatic Git deploys so pushes do not build on Vercel until CI passes.
- After **Quality** succeeds, GitHub Actions deploys **preview** (on PRs) and **production** (on `main`) with the Vercel CLI and your repo secrets. Deploy jobs are skipped if `VERCEL_*` secrets are missing.
- Production is expected to serve `https://blog.labdm.dev`.

Required repository secrets for deploys:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

See `CONTRIBUTING.md` for branch protection and merge policy.
