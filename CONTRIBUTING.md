# Contributing

## Branching

- Do not push directly to `main`.
- Create a feature branch for all work.
- Open a pull request for review before merging.

## Merge policy

- `main` is protected.
- At least one approval is required before merge.
- Stale approvals are dismissed when new commits are pushed.
- All review conversations must be resolved before merge.
- Squash merge is the only enabled merge strategy.
- Linear history is enforced on `main`.

## Local checks

Run these before opening or updating a pull request:

```bash
bun install --frozen-lockfile
bun run format:check
bun run lint
bun run typecheck
bun run build
bun run smoke
```

## Deployment secrets

GitHub Actions deploys to Vercel only when these repository secrets are set:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Automatic Vercel Git deploys are **off** in `vercel.json` (`git.deploymentEnabled: false`) so **Quality must pass before** preview or production deploy jobs run (`needs: quality`). If secrets are missing, Quality still runs; deploy jobs are skipped.

## Production domain expectation

- The canonical production host for this site is `https://blog.labdm.dev`.
- Preview deployments may use Vercel-generated URLs, but production metadata should always target `https://blog.labdm.dev`.

## Vercel setup

1. Create or link the Vercel project for this repository.
2. Assign `blog.labdm.dev` to the production environment.
3. Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` to the repo secrets (see README).
4. Push or open a PR to run Quality; deploy jobs run only after Quality succeeds.
