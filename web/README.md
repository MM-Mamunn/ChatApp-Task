# Secure Realtime Chat (Part 1)

Next.js application for the secure realtime chat assignment. Repository planning docs live in the parent directory; runnable code lives in this `web/` folder.

## Prerequisites

- Node.js 20+
- npm

## Environment variables

1. Copy `.env.example` to `.env.local`.
2. Fill in values as each feature is implemented. Step 1.1 does not require real secrets to run locally—the app starts with placeholder public defaults.

Committed files must never contain secrets. `.env.local` and other env files are gitignored; `.env.example` holds placeholders only.

## Local development

From this directory:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification (Step 1.1)

Run these checks before marking the foundation step complete:

```bash
npm run lint
npm run format:check
npm run build
```

Expected: all commands exit successfully; the dev server starts without requiring populated secrets in `.env.local`.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Framer Motion
- ESLint + Prettier
