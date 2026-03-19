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

GitHub Actions deploys to Vercel only when these repository secrets are configured:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

If these secrets are missing, the validation job still runs and the deploy jobs are skipped.

## Production domain expectation

- The canonical production host for this site is `https://blog.labdm.dev`.
- Preview deployments may use Vercel-generated URLs, but production metadata should always target `https://blog.labdm.dev`.

## Vercel setup

Create or link the Vercel project for this repository, then add the required secrets to GitHub:

1. Create the Vercel project for `labdm-blog`.
2. Assign `blog.labdm.dev` to the production environment for the project.
3. Copy the Vercel token, org ID, and project ID into the repository secrets.
4. Re-run the workflow or push a new commit to trigger preview or production deployment.
