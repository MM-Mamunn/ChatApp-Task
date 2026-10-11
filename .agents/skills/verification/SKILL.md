---
name: verification
description: >-
  How to verify implementation plan steps, permission matrix checks, and local
  CI commands for this repo. Use before marking work complete in
  PROJECT_PROGRESS.md.
---

# Verification

## Baseline (every `web/` change)

From `web/`:

```bash
npm run lint
npm run format:check
npm run build
```

For UI/runtime steps, also run `npm run dev` and exercise the flow in the browser.

## Plan step completion

1. Read the **Verify** column for the step in the relevant `IMPLEMENTATION_PLAN.md`.
2. Run the listed checks; capture exact commands and outcomes.
3. Update `PROJECT_PROGRESS.md` only after checks pass.
4. Do not implement the next step in the same change unless asked.

## Part 1 focus areas (PROJECT.md)

| Area | Minimum checks when relevant |
| --- | --- |
| Auth | Google + email/password success/failure; expired token; refresh; deactivated user blocked |
| RBAC | Permission matrix rows; 401/403; no self-admin; admin read-only on non-member chats |
| Chat | Duplicate direct conversation reuse; empty message rejected; pagination; persistence |
| Realtime | Two clients; message appears without refresh; non-member does not receive events |
| Admin | Dashboard blocked for `user`; role change and deactivation audited |
| Security | Headers/CORS/validation from step 1.5+; no secrets in client or logs |

## API contract (after step 1.3)

Cross-check every endpoint against assignment behaviors before implementing routes in 1.5–1.8.

## Skills integrity (step 1.2)

When editing `.agents/skills/`, ensure every **existing** file path mentioned matches the repo tree. Mark **future** paths as planned with the implementation step id — never imply files exist when they do not.

## Agent skills location

Repository skills: `.agents/skills/*/SKILL.md` (required for submission per PROJECT.md).

## Record template

In `PROJECT_PROGRESS.md` completed table: date, step id, summary, files, verification commands + exit codes, known issues.
