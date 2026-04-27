---
title: "Context‑driven production pipelines"
description: "Once an AI agent is in the loop, the pipeline stops being a static DAG and starts being a context. The hard part is no longer orchestration — it is what you load into the model's head."
pubDate: 2026-04-26
excerpt: "The CI/CD diagram on your wall is no longer the pipeline. The pipeline is the context window."
draft: true
tags: ["ai", "engineering", "devex"]
---

> **Thesis.** With agents in the loop, the unit of work is not a stage — it is a context. Production pipelines stop looking like a YAML file and start looking like a curated set of instructions, tools, files, and feedback that an agent can actually reason over.

<!-- TODO outline:
1. The old model: stages, runners, artifacts, gates.
2. The new question: what does the agent see when it's invoked?
3. Context engineering for pipelines: prompts, scoped repos, tool allow‑lists, retrieval over runbooks.
4. Where determinism still matters (releases, rollbacks) vs. where context‑driven judgement helps (triage, refactors, migrations).
5. A worked example: a context‑driven release notes step.
6. Failure modes: context bloat, prompt injection from logs, drift between dev and prod contexts.
-->
