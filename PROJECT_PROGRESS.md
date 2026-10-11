# Project Progress

## How to use this tracker

Update this file immediately after a verified implementation step. Keep planned work separate from completed work. Each completed entry must state: the plan step ID, what actually changed, important decisions, files changed, verification performed, and any remaining issue. Do not change a planned step to complete based only on intention or code generation.

## Current status

**Phase:** Part 1 in progress (step 1.1 complete).

**Application location:** Runnable Part 1 code lives in `web/` (repo root holds planning docs only).

**Source of requirements:** `MidLevel_FullStack_Developer_Take_Home_Assignment_PD.pdf` (reviewed 2026-10-11).

**Required implementation order:** Part 1 - API/security/chat; Part 2 - creative landing page; Part 3 - verification, submission, and thought-process write-up.

## Completed work

| Date | Plan step | What was actually implemented | Decisions / files changed | Verification | Known issues |
| --- | --- | --- | --- | --- | --- |
| 2026-10-11 | Planning setup | Created the three dependency-ordered implementation plans and this progress tracker. No application code, configuration, or runtime behavior was implemented. | Added `01_api-and-chat/IMPLEMENTATION_PLAN.md`, `02_creative-landing-page/IMPLEMENTATION_PLAN.md`, `03-submission-and-write-up/IMPLEMENTATION_PLAN.md`, and `PROJECT_PROGRESS.md`. | Reviewed all six assignment PDF pages; confirmed the required stack and Part 1 -> Part 2 -> Part 3 dependency order. | The repository contains no starter application, so Part 1 step 1.1 remains unstarted. |
| 2026-10-11 | 1.1 | Initialized Next.js 16 (App Router) + TypeScript in `web/` with Tailwind CSS v4, Framer Motion, ESLint, Prettier, and env placeholders. Added a minimal scaffold home page, public env helper, and `.env.example` (no committed secrets). | **Decision:** App root is `web/` because the git repo root already contains planning files and `create-next-app` rejects an uppercase npm package name for the folder `Task`. **Files:** `web/` (package.json, next.config.ts, app/, components/, lib/env/public.ts, eslint.config.mjs, .prettierrc, .env.example, README.md, etc.). | From `web/`: `npm run lint`, `npm run format:check`, and `npm run build` (all exit 0); `npm run dev` ready on port 3000 without `.env.local`; `GET http://localhost:3000` → 200. Inspected `.env.example` for placeholders only. | Server-side env validation (Zod) deferred to step 1.5. npm audit reports dependency advisories from the default Next.js template (not addressed in this step). |

## Planned / incomplete work

- **Part 1:** Steps 1.2 through 1.11 remain; see `01_api-and-chat/IMPLEMENTATION_PLAN.md`.
- **Part 2:** All steps 2.1 through 2.5 are planned and blocked on verified Part 1 work; see `02_creative-landing-page/IMPLEMENTATION_PLAN.md`.
- **Part 3:** All steps 3.1 through 3.5 are planned and blocked on verified Parts 1 and 2; see `03-submission-and-write-up/IMPLEMENTATION_PLAN.md`.

## Entry template for the next completed step

| Date | Plan step | What was actually implemented | Decisions / files changed | Verification | Known issues |
| --- | --- | --- | --- | --- | --- |
| YYYY-MM-DD | 1.1 | Concise factual result. | Key decision; exact files. | Exact commands/tests and outcome. | None, or a concrete follow-up. |
