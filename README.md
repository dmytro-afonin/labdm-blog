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
