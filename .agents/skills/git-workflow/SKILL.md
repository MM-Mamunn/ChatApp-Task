---
name: git-workflow
description: >-
  Git conventions, plan-step scope, and PROJECT_PROGRESS updates for this
  repository. Use when committing work or completing implementation plan steps.
---

# Git workflow

## Repository layout vs git root

- Git root: `/` (contains `PROJECT.md`, plans, `.agents/skills/`, `web/`).
- Application npm project: `web/` only — run `npm` commands from `web/`.

## Implementation discipline

- Follow `01_api-and-chat/IMPLEMENTATION_PLAN.md` order unless `PROJECT.md` changes.
- **One plan step per request** unless the user explicitly asks for more.
- Do not mark a step complete without verification described in the plan.

## Progress tracking

After a verified step, append a row to **Completed work** in `PROJECT_PROGRESS.md`:

- Plan step ID, date, what changed, decisions, exact files, commands run, known issues.
- Update **Current status** and **Planned / incomplete work** sections.

## Commits

- Commit only when the user asks.
- Do not commit secrets (env files with real values, keys, tokens).
- Do not amend pushed commits or force-push `main` unless explicitly requested.
- Suggested message style: `feat(part1): step 1.x — short why-focused summary`.

## What to stage

- Include `.agents/skills/` when adding/updating skills.
- Exclude `web/node_modules/`, `web/.next/` (already gitignored under `web/`).

## Plans as source of order

| Part | Plan file |
| --- | --- |
| 1 | `01_api-and-chat/IMPLEMENTATION_PLAN.md` |
| 2 | `02_creative-landing-page/IMPLEMENTATION_PLAN.md` |
| 3 | `03-submission-and-write-up/IMPLEMENTATION_PLAN.md` |

If plan and `PROJECT.md` conflict, fix the plan or update `PROJECT.md` before coding.
