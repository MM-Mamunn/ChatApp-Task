---
name: realtime-state
description: >-
  Supabase Realtime subscriptions, client state, and live message delivery for
  conversations the user belongs to. Use when implementing chat updates or
  client data flow.
---

# Realtime and client state

## Realtime transport

- Use **Supabase Realtime** on PostgreSQL changes (or channels per contract).
- **No custom WebSocket server** (PROJECT.md constraint).

## Authorization for live updates

- Users receive updates **only for conversations they belong to**.
- Enforce membership in RLS/policies (step 1.4) and verify client subscription filters match server rules.
- Admins may have read-only visibility paths; they must not receive write capabilities on others’ conversations.

## Client patterns (when UI exists, step 1.9–1.10)

- Prefer a single source of truth for active conversation + message list; merge realtime inserts idempotently (by message id).
- Handle loading, empty, and error states explicitly.
- **Auto-scroll**: scroll to bottom on new messages only when the user is already near the bottom; do not jerk viewport while reading history.

## Server vs client

- Initial history via Route Handler / server fetch; incremental updates via Realtime.
- Do not expose Supabase service role to the browser; use anon key + user session as designed in auth step.

## Framer Motion

- Use for meaningful motion (message arrival, panel transitions) per PROJECT.md; respect `prefers-reduced-motion` when adding animations (especially Part 2 landing).

## Public env

- `web/lib/env/public.ts` exposes `NEXT_PUBLIC_APP_URL`; Supabase public URL/key will come from env once wired (see `web/.env.example`).
