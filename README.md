# labdm-blog

A Bun-first Astro blog with GitHub-based delivery and Vercel deployment automation.

## Stack

- Astro for the site
- Bun for installs and scripts
- GitHub Actions for validation and deployment orchestration
- Vercel for preview and production hosting

## Local development

```bash
bun install
bun run dev
```

Useful scripts:

- `bun run format:check`
- `bun run lint`
- `bun run check`
- `bun run typecheck`
- `bun run build`
- `bun run smoke`
- `bun run preview`

## Deployment flow

- Pull requests run formatting, lint, typecheck, build, and smoke validation in the `Quality` job.
- Vercel preview deploys run automatically on pull requests when Vercel secrets are configured.
- Preview deployment URLs are published in the workflow summary and as a pull request comment.
- Production deploys run automatically on pushes to `main`.

Required repository secrets for deployment:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

See `CONTRIBUTING.md` for the branch protection, PR, and merge policy.
