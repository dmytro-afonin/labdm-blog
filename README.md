# labdm-blog

A Bun-first Astro blog with GitHub-based delivery and Vercel deployment automation.

## Stack

- Astro for the site
- Bun for installs and scripts
- GitHub Actions for validation and deployment orchestration
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

- `bun run check`
- `bun run build`
- `bun run preview`

## Deployment flow

- Pull requests run the `Quality` GitHub Actions job.
- Vercel preview deploys run automatically on pull requests when Vercel secrets are configured.
- Production deploys run automatically on pushes to `main` and are expected to serve `https://blog.labdm.dev`.

Required repository secrets for deployment:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

See `CONTRIBUTING.md` for the branch protection, PR, and merge policy.
