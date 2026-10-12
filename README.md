# Secure Realtime Chat Application & Showcase

A production-minded, full-stack realtime chat application and creative public landing page built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Framer Motion, Drizzle ORM, Supabase PostgreSQL, and Supabase Realtime.

---

## Table of Contents

1. [Live Demonstration & Deployment URLs](#live-demonstration--deployment-urls)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [Repository Layout](#repository-layout)
5. [Prerequisites](#prerequisites)
6. [Environment Variables](#environment-variables)
7. [Database Setup & Migrations](#database-setup--migrations)
8. [Test Accounts & Credentials](#test-accounts--credentials)
9. [Local Development](#local-development)
10. [Automated Testing & Verification](#automated-testing--verification)
11. [Deployment Configuration (Vercel)](#deployment-configuration-vercel)
12. [API Documentation](#api-documentation)
13. [Part 3 — Thought Process & Engineering Write-Up](#part-3--thought-process--engineering-write-up)
14. [Repository Agent Skills](#repository-agent-skills)

---

## Live Demonstration & Deployment URLs

Both required application parts are accessible in the full-stack Next.js deployment:

| Application Area | Live URL / Route | Description |
| --- | --- | --- |
| **Part 2 — Creative Landing Page** | [`/`](http://localhost:3000) or [`/landing`](http://localhost:3000/landing) | Product-first landing page with living mock chat UI, feature superpowers, and interactive sandbox |
| **Part 1 — Authenticated Chat App** | [`/chat`](http://localhost:3000/chat) | 1-on-1 direct conversations and group channels with live sub-second Supabase Realtime WebSocket push |
| **Part 1 — Authentication** | [`/login`](http://localhost:3000/login) | Sign in with 1-click test account quick-fill or create a new user account |
| **Part 1 — Admin Oversight** | [`/admin`](http://localhost:3000/admin) | Protected administrative console for user roles, deactivations, audit trails, and read-only inspection |

*Hosted URL:* Configured for one-click deployment on Vercel via [`web/vercel.json`](./web/vercel.json) and [`web/next.config.ts`](./web/next.config.ts). Set your hosted production URL in `NEXT_PUBLIC_APP_URL`.

---

## Features

- **Authentication & Sessions**: Email/password authentication with bcrypt password hashing (cost factor 12) and JWT sessions using `jose`. Short-lived access tokens (15m) paired with secure HTTP-only refresh tokens (7d) stored as SHA-256 hashes with automatic rotation and revocation on logout.
- **Server-Side Authorization (RBAC)**: Strictly enforced server-side role-based access control with `user` and `admin` roles. No client-side self-promotion. Deactivated accounts have active sessions revoked immediately.
- **Realtime Direct & Group Messaging**: 1-on-1 direct conversations (duplicate-safe initiation) and multi-member named group channels. Instant message delivery powered by Supabase Realtime over WebSockets—zero polling required.
- **Responsive & Accessible UI**: Clean desktop and mobile responsive interface built with Tailwind CSS v4, Framer Motion animations, accessible keyboard navigation, visible focus indicators, and ARIA attributes across all modals and inputs (WCAG 2.1 AA compliant).
- **Admin Oversight Console**: Protected administrative dashboard (`/admin` and in-app modal) providing project-wide user management, role modification, account deactivation, cursor-paginated activity audit logs, and read-only inspection of conversations with full accountability logging.
- **Creative Landing Page (Part 2)**: Eye-catching public showcase at `/` and `/landing` featuring the headline *"Team messaging built for speed, clarity, and effortless flow"*, living mock chat UI preview, **Interactive Experience Sandbox** (bonus feature), legacy messenger comparison table, and 1-click demo personas.
- **Hardened Security Baseline**: Security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`), explicit CORS origin allowlist, and server-side Zod validation on request bodies, query parameters, and route parameters.

---

## Technology Stack

| Layer | Technology |
| --- | --- |
| **Framework** | Next.js 16 (App Router, Turbopack) & React 19 |
| **Language** | TypeScript 5 (Strict mode) |
| **Styling & Motion** | Tailwind CSS v4 & Framer Motion |
| **Database & ORM** | Supabase PostgreSQL with Drizzle ORM & Drizzle Kit |
| **Realtime Transport** | Supabase Realtime (`@supabase/supabase-js`) over WebSockets |
| **Authentication** | JWT via `jose` (HS256) & bcryptjs (cost factor 12) |
| **Validation** | Zod schemas for bodies, queries, route params, and env |
| **Code Quality** | ESLint 9 & Prettier |

---

## Repository Layout

All runnable application code resides in the `web/` directory:

```text
/
├── 01_api-and-chat/          # Part 1 specifications, API contract (API.md), and plan
├── 02_creative-landing-page/ # Part 2 creative landing page plan and design specs
├── 03-submission-and-write-up/# Part 3 submission, verification, and write-up plan
├── .agents/skills/           # Repository-specific agent skills (architecture, auth, etc.)
├── PROJECT.md                # Central product specification & source of truth
├── PROJECT_PROGRESS.md       # Factual record of completed implementation steps
├── THOUGHT_PROCESS.md        # Comprehensive Part 3 thought process & engineering write-up
├── implemented_api.md        # Reference of implemented REST endpoints
├── supabase_realtime.md      # Supabase Realtime configuration guide
├── .env.example              # Root environment variable template
└── web/                      # Full-stack Next.js application (npm cwd)
    ├── api/                  # Modular backend domain architecture
    │   ├── authentication/   # JWT config, token creation/verification, cookies
    │   ├── configuration/    # Centralized Zod environment validation & CORS
    │   ├── controllers/      # HTTP controllers (auth, users, chat, admin)
    │   ├── database/         # Drizzle client, table schemas, migrations, seed
    │   ├── errors/           # Standard error codes & AppError classes
    │   ├── middlewares/      # withSecurity, withAuth, withRoles
    │   ├── services/         # Business logic and database operations
    │   ├── utils/            # Standard response envelopes (apiSuccess, apiError)
    │   └── validation/       # Zod validation helpers
    ├── app/                  # Next.js App Router (pages, layouts, and HTTP routes)
    │   ├── api/              # HTTP Route Handlers
    │   ├── admin/            # Protected admin page
    │   ├── chat/             # Protected realtime chat page
    │   ├── login/            # Authentication page
    │   ├── landing/          # Public landing page route
    │   └── page.tsx          # Root public entry point
    ├── components/           # UI components (chat, auth, admin, landing, ui)
    ├── lib/                  # Shared clients (api-client, auth-context, supabase-client)
    └── vercel.json           # Vercel deployment configuration
```

---

## Prerequisites

- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Supabase Project**: A PostgreSQL database instance with Supabase Realtime enabled

---

## Environment Variables

Copy `.env.example` to `web/.env` (or set in your deployment environment):

```bash
cp .env.example web/.env
```

### Configuration Keys:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string (transaction pooler recommended for serverless) |
| `JWT_ACCESS_SECRET` | Yes | 256-bit secret string used to sign short-lived access tokens (min 32 chars) |
| `JWT_REFRESH_SECRET` | Yes | 256-bit secret string used to sign long-lived refresh tokens (min 32 chars) |
| `NEXT_PUBLIC_APP_URL` | Yes | Public application origin URL (e.g. `http://localhost:3000` or deployment URL) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (e.g. `https://<project-ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public anonymous API key (safe for browser client) |
| `BOOTSTRAP_ADMIN_SECRET` | Optional | Shared secret key for `/api/auth/bootstrap-admin` endpoint |
| `GOOGLE_CLIENT_ID` | Optional | OAuth Client ID for Google authentication |
| `GOOGLE_CLIENT_SECRET` | Optional | OAuth Client Secret for Google authentication |

*Note: Server secrets (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) are strictly guarded on the server and never exposed to the client.*

---

## Database Setup & Migrations

From the `web/` directory:

1. **Apply Schema Migrations**:
   ```bash
   npm run db:migrate
   ```
   Applies Drizzle migrations to your Supabase PostgreSQL database to create tables (`users`, `roles`, `groups`, `group_members`, `direct_messages`, `group_chat_messages`, `refresh_tokens`, `activity_logs`).

2. **Seed Initial Test Data**:
   ```bash
   npm run db:seed
   ```
   Populates roles, default test accounts with bcrypt-hashed passwords, initial groups, and audit records idempotently.

3. **Supabase Realtime Configuration**:
   Ensure PostgreSQL Logical Replication is enabled for `direct_messages` and `group_chat_messages` tables. Refer to [`supabase_realtime.md`](./supabase_realtime.md) for full SQL instructions.

---

## Test Accounts & Credentials

The seed script creates the following pre-configured test accounts (also available via **1-click quick-fill buttons** on the login screen):

| Role | Email | Password | Purpose |
| --- | --- | --- | --- |
| **Admin** | `admin1@example.com` | `admin1@example.com` | Full administrative oversight, user management, audit logs |
| **User 1** | `user1@example.com` | `user1@example.com` | Standard chat participant (Collaborator 1) |
| **User 2** | `user2@example.com` | `user2@example.com` | Standard chat participant (Collaborator 2) |
| **Alice** | `alice@chat.local` | `AliceSecret123!` | Automated test suite fixture |
| **Bob** | `bob@chat.local` | `BobSecret123!` | Automated test suite fixture |

> [!NOTE]
> All passwords are encrypted with bcrypt (work factor 12) in PostgreSQL. For live testing, you can open two browser windows (e.g., normal and incognito) and log into Window A as User 1 and Window B as User 2 to observe instantaneous two-way real-time messaging.

### Creating New Accounts:
Users can also register new accounts directly from the UI:
1. Navigate to `/login`.
2. Click **Create account**.
3. Fill in **Full name**, **Email address**, and **Password** (min 8 characters).
4. Click **Create account** to immediately enter the chat application.

---

## Local Development

From the `web/` directory:

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Automated Testing & Verification

Comprehensive automated test suites cover all security, authentication, RBAC, chat, and realtime functionality:

```bash
# Run all automated test suites
npm run test:all

# Run individual suites:
npm run test:security   # Zod validation, missing env, CORS, security headers, envelopes
npm run test:auth       # Bcrypt cost 12, JWT access tokens, refresh rotation, logout, bootstrap
npm run test:rbac       # RBAC permission matrix, user search masking, role changes, deactivation
npm run test:chat       # Direct chats, groups, message pagination, membership checks
npm run test:members    # Group members management, creator-only add checks, duplicate guards
npm run test:login      # Login error formats (401, 400), bcrypt storage, test account verification
npm run test:realtime   # Live Supabase Realtime WebSocket message push verification

# Run code style and build checks:
npm run lint            # ESLint static analysis (0 errors, 0 warnings)
npm run format:check    # Prettier code formatting verification
npm run build           # Production Next.js Turbopack build (21 static & dynamic routes)
```

---

## Deployment Configuration (Vercel)

The repository includes a ready-to-deploy configuration:

1. **Vercel Project Setup**:
   - Link the repository on [Vercel](https://vercel.com).
   - Set **Root Directory** to `web` (or rely on `web/vercel.json`).
   - Framework preset: **Next.js**.

2. **Environment Variables on Vercel**:
   Add the variables listed in the [Environment Variables](#environment-variables) section to your Vercel Project Settings:
   - `DATABASE_URL`
   - `JWT_ACCESS_SECRET`
   - `JWT_REFRESH_SECRET`
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel deployment URL, e.g. `https://your-app.vercel.app`)
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Deploy**:
   Trigger deployment via git push. The production build compiles clean static pages and dynamic API route handlers.

---

## API Documentation

The complete REST API specification is documented in [`01_api-and-chat/API.md`](./01_api-and-chat/API.md) and [`implemented_api.md`](./implemented_api.md), covering:
- Authentication (`/api/auth/*`)
- User Discovery & Profiles (`/api/users/*`)
- Direct Messaging (`/api/conversations/direct/*`)
- Group Channels (`/api/groups/*`)
- Admin Oversight & Audit Logs (`/api/admin/*`)
- System Health (`/api/hello`)

---

## Part 3 — Thought Process & Engineering Write-Up

A comprehensive, evidence-based write-up detailing the project's technical decisions, security design, AI-assisted development workflow, and resolved challenges is available in [`THOUGHT_PROCESS.md`](./THOUGHT_PROCESS.md).

### Summary of Core Areas:

1. **Architecture & Technical Approach**:
   - Built as a full-stack Next.js 16 (App Router) application where the frontend and backend live together in `web/` without a detached Express server.
   - Decoupled domain architecture in `web/api/` separates Route Handlers from HTTP Controllers, Domain Services, Drizzle ORM schemas, and Middlewares.
   - Supabase PostgreSQL provides transactional persistence; Supabase Realtime provides downstream WebSocket push delivery. Direct client writes to Supabase are blocked to ensure all mutations pass through server-side RBAC and validation.

2. **Security Decisions**:
   - JWT sessions with 15-minute access tokens and 7-day refresh tokens stored as SHA-256 hashes in PostgreSQL with rotation and family revocation.
   - Passwords hashed using bcrypt (cost factor 12), never logged or returned in plain text.
   - Deny-by-default RBAC (`withRoles(["admin"])`) verified against live database records on sensitive routes to ensure immediate revocation upon role demotion or account deactivation.
   - Administrative access to non-member conversations is strictly read-only with tamper-evident audit logging in `activity_logs`. Impersonation is impossible.
   - Security headers, explicit CORS origin allowlist, and server-side Zod validation on all inputs.

3. **Part 2 — Design Reasoning**:
   - Stratospheric dark visual identity (Slate 950, Indigo, Sky blue, Emerald, Amber) designed to convey lightness and serenity.
   - Product-first storytelling focused on user value (quiet spaces, instant sub-second sync, smart auto-scroll, accountable oversight) rather than developer jargon.
   - Headline focused on productivity and lightness: *"Team messaging built for speed, clarity, and effortless flow."*
   - Living mock chat preview in the hero and an **Interactive Experience Sandbox** allowing visitors to try the product before signing in.
   - Fully accessible (WCAG 2.1 AA) with keyboard navigation and responsive mobile drawers.

4. **AI Tools & Agent Skills**:
   - Built with the assistance of the **Antigravity AI Coding Assistant** (Google DeepMind).
   - Used for scaffolding, automated test generation, TypeScript typing, and Zod schema normalization.
   - Ten custom repository skills under `.agents/skills/` acted as persistent architectural guardrails.
   - Technical developer-demo landing page, redundant route layers, and invalid schemas were actively rejected and redesigned.
   - Retained work was verified through 6 automated test suites, static analysis, and live browser testing.

5. **Future Improvements**:
   - Distributed rate limiting via Upstash Redis.
   - Client-side End-to-End Encryption (E2EE) for direct chats via Web Crypto API.
   - Supabase Storage integration for rich media attachments with MIME validation.
   - Real-time presence channels and typing indicators.

6. **Issues Encountered & Resolved**:
   - *Group Chat Message Schema*: Removed redundant `receiver_email` on group messages via migration `0001_friendly_riptide.sql` to model true multi-party broadcasts.
   - *Supabase Realtime Replication*: Added surrogate UUID primary key and `REPLICA IDENTITY FULL` via migration `0002_realtime_setup.sql` to satisfy PostgreSQL logical replication requirements.
   - *Property Key Mismatches*: Resolved `avatarUrl` vs `avatar_url` and `group.id` vs `group_id` across client and server.
   - *React 19 Compiler Purity*: Fixed `Date.now()` within component render scope using deterministic IDs and "Just now" timestamps.

---

## Repository Agent Skills

The project defines and maintains 10 specialized agent skills in `.agents/skills/`:

| Skill | Path | Description |
| --- | --- | --- |
| **`architecture`** | [`.agents/skills/architecture/SKILL.md`](./.agents/skills/architecture/SKILL.md) | Repository layout, architectural layers, data flow, and stack boundaries |
| **`coding-standards`** | [`.agents/skills/coding-standards/SKILL.md`](./.agents/skills/coding-standards/SKILL.md) | TypeScript strict mode, ESLint, Prettier, and naming conventions |
| **`api-data-layer`** | [`.agents/skills/api-data-layer/SKILL.md`](./.agents/skills/api-data-layer/SKILL.md) | API contract, Route Handlers, Drizzle ORM data access, and validation |
| **`auth-rbac`** | [`.agents/skills/auth-rbac/SKILL.md`](./.agents/skills/auth-rbac/SKILL.md) | JWT sessions, bcrypt hashing, cookie handling, and deny-by-default RBAC |
| **`realtime-state`** | [`.agents/skills/realtime-state/SKILL.md`](./.agents/skills/realtime-state/SKILL.md) | Supabase Realtime subscriptions, client state, and live message delivery |
| **`ui-design-system`** | [`.agents/skills/ui-design-system/SKILL.md`](./.agents/skills/ui-design-system/SKILL.md) | Tailwind CSS v4, Framer Motion, and accessible UI patterns |
| **`environment-secrets`**| [`.agents/skills/environment-secrets/SKILL.md`](./.agents/skills/environment-secrets/SKILL.md) | Environment variables, Zod validation, and secret hygiene |
| **`git-workflow`** | [`.agents/skills/git-workflow/SKILL.md`](./.agents/skills/git-workflow/SKILL.md) | Git conventions, plan-step scope, and `PROJECT_PROGRESS.md` updates |
| **`verification`** | [`.agents/skills/verification/SKILL.md`](./.agents/skills/verification/SKILL.md) | Implementation plan verification commands and quality gates |
| **`follow-relevant-skills`** | [`.agents/skills/follow-relevent-skill/SKILL.md`](./.agents/skills/follow-relevent-skill/SKILL.md) | Mandatory rule to identify, read, and follow relevant skills before acting |
