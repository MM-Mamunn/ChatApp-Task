---
name: environment-secrets
description: >-
  Environment variables, .env.example, and secret handling for web/. Use when
  adding config, deployment settings, or Supabase/OAuth/JWT credentials.
---

# Environment and secrets

## Files

| File | Role |
| --- | --- |
| `/.env.example` | Committed placeholders and documentation at the repository root |
| `/.env` | Shared local secrets for development (gitignored at root) |
| `web/.env.example` | App-level documentation pointing to root `.env` |
| `web/.env.local` | Optional local override secrets (gitignored) |
| `/.gitignore` & `web/.gitignore` | Ignores `.env*` except `!.env.example` |

Never commit real credentials, `.env`, `.env.local`, or service role keys.

## Configuration & Environment Helpers

- `web/lib/env/public.ts` — `NEXT_PUBLIC_APP_URL` client helper with default `http://localhost:3000`.
- `web/api/configuration/env.ts` — Server-side environment reader (`requireEnv`, `optionalEnv`, `MissingEnvError`). Next.js preloads the root `.env` via `web/next.config.ts`.
- Full server env validation with Zod lands in step **1.5**; until then avoid reading sensitive env in client components.

## Variables (placeholders in `.env.example`)

- `NEXT_PUBLIC_APP_URL` — frontend origin for CORS and links.
- `DATABASE_URL` — Supabase PostgreSQL connection string for Drizzle ORM.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `ADMIN_BOOTSTRAP_EMAIL` — bootstrap admin (mechanism in API contract)

Add new vars to **both** `.env.example` and this skill only when introduced; document in `web/README.md` at submission (step 1.11).

## Rules

- Server-only secrets must not use `NEXT_PUBLIC_` prefix.
- Do not log env values in production code paths.
- Deployment (Vercel/Netlify): configure env in host dashboard; never paste secrets into chat or commits.

## Local run without secrets

Step 1.1 verified the app starts without populated `.env.local` for the scaffold page; feature steps will require real Supabase/OAuth/JWT values.
