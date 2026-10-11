---
name: ui-design-system
description: >-
  Tailwind CSS, Framer Motion, layouts, and UX patterns for chat, auth, and
  admin UI in web/. Use when building or styling user-facing screens.
---

# UI and design system

## Stack

- **Tailwind CSS v4** — entry `web/app/globals.css`; Turbopack loader in `web/next.config.ts`.
- **Framer Motion** — client components only (`"use client"`); see `web/components/foundation-status.tsx`.
- **Fonts** — Geist via `next/font` in `web/app/layout.tsx`.

## Layout baseline

- Root layout: `web/app/layout.tsx` (`min-h-full`, antialiased body).
- Use responsive utilities; test mobile and desktop for chat and admin (plan steps 1.9–1.11).

## Required UX (PROJECT.md)

- Login: Google + email/password; loading, cancelled, and failed states.
- Protected routes for authenticated app and admin dashboard.
- Chat: direct/group creation, message list with sender + timestamp, send, loading/empty/error, safe auto-scroll.
- Admin dashboard: user list, conversations/messages (read-only where required), activity log, role/deactivate controls — **admin-only** route, server-enforced.

## Motion

- Meaningful Framer Motion transitions (not decorative noise).
- Prefer `motion` for enter/exit of messages and panels once chat UI exists.

## Components

- Shared UI in `web/components/`; route-specific sections can live under `web/app/...` if small.
- Keep admin UI visually distinct enough to avoid accidental conflation with user chat actions.

## Part 2 landing page

- Implemented per `02_creative-landing-page/IMPLEMENTATION_PLAN.md`; original responsive design, separate public URL requirement in PROJECT.md.
- Reuse tokens/patterns from Part 1 where practical; do not claim features the app lacks.

## Accessibility

- Semantic HTML, keyboard navigable controls, visible focus; verify in step 1.11 hardening.
