---
name: coding-standards
description: >-
  TypeScript, ESLint, Prettier, and naming conventions for the web/ app. Use
  when writing or reviewing application code in this repository.
---

# Coding standards

## Language and tooling

- **TypeScript** everywhere under `web/`; strict typing for API payloads and domain types.
- **ESLint**: `web/eslint.config.mjs` (Next core-web-vitals + TypeScript + Prettier flat compat).
- **Prettier**: `web/.prettierrc` — run `npm run format` / `npm run format:check` from `web/`.
- **Imports**: use `@/*` alias (maps to `web/` root per `web/tsconfig.json`).

## Commands (from `web/`)

```bash
npm run lint
npm run format:check
npm run build
```

Run these after non-trivial changes; record verification in `PROJECT_PROGRESS.md` when completing plan steps.

## File placement

| Kind | Location |
| --- | --- |
| App routes and layouts | `web/app/` |
| Reusable UI | `web/components/` |
| Server-only helpers | `web/lib/` (prefer `"server-only"` package when added) |
| Client hooks/state | `web/lib/` or `web/hooks/` once introduced |
| Route Handlers | `web/app/api/**/route.ts` when API steps begin |

Do not add business logic to `web/public/`. Keep planning docs at repo root, not inside `web/app/`.

## React / Next.js

- Default to **Server Components**; add `"use client"` only for hooks, browser APIs, or Framer Motion.
- Prefer async server components and Route Handlers over ad hoc fetch wrappers duplicating auth.
- Metadata in `layout.tsx` / `page.tsx`; avoid leaking env secrets into client bundles.

## Style

- Match existing Tailwind utility style in `web/app/page.tsx` and `web/components/`.
- Small, focused modules; avoid drive-by refactors outside the current plan step.
- Comments only for non-obvious business rules or security constraints.

## Errors

- Use the shared API error shape once implemented (step 1.5); until then avoid inventing multiple error formats.
- Never log passwords, tokens, or refresh secrets.
