---
name: api-data-layer
description: >-
  API contract, Route Handlers, Drizzle ORM data access, validation, and
  pagination for this chat app. Use when designing or implementing endpoints and
  database interactions.
---

# API and data layer

## Before coding routes

1. Read `PROJECT.md` functional requirements and permission matrix.
2. Implement or follow the **API contract** from step 1.3 (path TBD in progress tracker — likely under `01_api-and-chat/`).
3. Do not ship Route Handlers that contradict the documented contract.

## Route Handlers & API Architecture

- HTTP Endpoints: `web/app/api/**/route.ts` (Next.js App Router).
- Endpoint modules delegate to `web/api/routes/` -> `web/api/controllers/` -> `web/api/services/`.
- Validate **body, query, and route params** with Zod (step 1.5+).
- Return consistent JSON errors: 400 invalid input, 401 unauthenticated, 403 forbidden, 404 when appropriate.

## Domain resources (assignment)

Users/profiles, conversations (direct + group), participants/membership, messages, activity/audit events, admin listings. Persist in Supabase PostgreSQL via Drizzle ORM (`web/api/database/client.ts`); schema in `web/api/database/schema/` and versioned SQL migrations in `web/api/database/migrations/`.

## Data access patterns

- Use Drizzle ORM (`getDb()`) for database queries within `web/api/services/`.
- **RLS & Server Authorization** must align with RBAC and conversation membership (step 1.4).
- **Direct conversations**: creating a duplicate pair must return the existing conversation id, not a second row.
- **Messages**: reject empty/whitespace-only content; ordered history with sensible pagination (format defined in API contract).

## Activity log

Record sign-ins, user creation, conversation/group creation, messages sent, role changes, deactivations, and accountable admin actions (e.g. role change, viewing another user’s conversation).

## Pagination and lists

- Conversation list: most recent activity first.
- Message history: ordered, paginated per contract (cursor or offset — decide in 1.3 and document).

## Open decisions

Field names, exact route paths, error object schema, and pagination envelope are intentionally unset until step 1.3 — do not hardcode divergent shapes across files.
