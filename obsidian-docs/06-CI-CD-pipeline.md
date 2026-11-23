# CI/CD pipeline (reference)

Source: `.github/workflows/ci.yml` (workflow `CI`), `.github/workflows/audit.yml`, `vercel.json`, `package.json` scripts.

## Delivery model

- GitHub Actions validates code only (the `quality` job): format, lint, typecheck, build, smoke.
- **Vercel's GitHub integration** creates preview deployments for pull requests and production deployments for pushes to `main`. `vercel.json` no longer sets `git.deploymentEnabled: false`.
- Vercel's remote build uses `installCommand` / `buildCommand` from `vercel.json`, so the Neon DB URL is available for `pnpm run db:migrate` during the build.
- **No repository secrets are required for deploys.** The old `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` secrets are unused and can be removed.

## `quality` job (name: "Quality")

Runner: `ubuntu-latest`. Triggered on every pull request and on pushes to `main`.

| Step        | Command                                                        |
| ----------- | -------------------------------------------------------------- |
| Checkout    | `actions/checkout@v6`                                          |
| Node        | `actions/setup-node@v6` with `.node-version` (26 LTS)          |
| pnpm        | `pnpm/action-setup@v4`, version 12.21.0, plus pnpm store cache |
| Install     | `pnpm install --frozen-lockfile`                               |
| Format      | `pnpm run format:check`                                        |
| Lint code   | `pnpm run lint:code` (Oxlint)                                  |
| Lint styles | `pnpm run lint:styles` (Stylelint)                             |
| Types       | `pnpm run typecheck` (`astro check`)                           |
| Build       | `pnpm run build`                                               |
| Smoke       | `pnpm run smoke`                                               |

## Dependency audit

`.github/workflows/audit.yml` runs `pnpm run deps:scan` (`pnpm audit --audit-level=high`) on pull requests, pushes to `main`, and weekly. The step is currently **non-blocking** (`continue-on-error: true`) and prints findings to the job summary; flip it to blocking once existing advisories are fixed.

## `vercel.json`

- `framework: astro`, `installCommand: pnpm install --frozen-lockfile`, `buildCommand: pnpm run db:migrate && pnpm run build`, `devCommand: pnpm run dev`, `regions: ["iad1"]`.
- Git deployments are enabled so Vercel reacts to PRs and pushes directly.

## Local parity

```bash
pnpm install --frozen-lockfile
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run build
pnpm run smoke
pnpm run deps:scan
```

`pnpm run verify:push` covers the first six commands.

## See also

- [[04-Architecture]] — route vs static split in this repo.
- [[07-Newsletter-subscriber-flows]] — product flows (deploy does not run newsletter sync scripts).
