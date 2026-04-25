# Agent context (labdm-blog)

## Obsidian documentation

- The **only** Obsidian vault in this repository is **`obsidian-docs/`** (not `vault/`). Open that folder in the Obsidian app.
- **Product and planning notes** (roadmap, architecture, etc.) live at the top of **`obsidian-docs/`** (e.g. `00-Index.md`, `01-*.md`). Detailed **CI/CD** and **newsletter** behavior is in `06-CI-CD-pipeline.md` and `07-Newsletter-subscriber-flows.md` — keep those updated when the pipeline or `src/lib/newsletter.ts` changes. The repo is already the labdm-blog project—**do not** nest another `Project/labdm-blog` folder.
- When adding or updating that documentation, **put it in `obsidian-docs/`**. Do not create a separate root `vault/` for the same purpose.
- For contributors who do not use Obsidian, `README.md`, `docs/`, and `CONTRIBUTING.md` remain the primary developer docs; `docs/obsidian-vault.md` explains how the `obsidian-docs` folder relates to the repo.

## Related

- Canonical production URL: `https://blog.labdm.dev` (see `README.md`).
